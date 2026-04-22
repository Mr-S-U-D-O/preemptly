import express from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { createServer as createViteServer } from "vite";
import path from "path";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { GoogleGenAI } from "@google/genai";
import {
  initializeApp,
  getApps,
  getApp,
  applicationDefault,
  cert,
} from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Parser from "rss-parser";
import { pseoData } from "./src/data/pseo";
// Global Error Handlers to prevent silent crashes and help debugging
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[CRITICAL] Unhandled Rejection at:",
    promise,
    "reason:",
    reason,
  );
});

/**
 * Phase 1.2: Generates a deterministic, collision-resistant document ID for
 * each lead based on a SHA-256 hash of its URL and scraperId.
 * This replaces the expensive 1000-lead lookback query for deduplication.
 * Using setDoc with the same ID is idempotent — duplicates are silently skipped.
 */
function generateLeadId(postUrl: string, scraperId: string): string {
  return createHash("sha256")
    .update(`${scraperId}::${postUrl}`)
    .digest("hex")
    .substring(0, 40);
}

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

// Load config safely
const firebaseConfig = JSON.parse(
  readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"),
);

// Set environment variables to force the correct project ID for Admin SDK
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
}

// Initialize Firebase Admin (for background tasks to bypass rules)
console.log("[Firebase Admin] Initializing...");
try {
  if (!getApps().length) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = cert(serviceAccount);
        console.log(
          "[Firebase Admin] Using Service Account from environment variable",
        );
      } catch (parseError) {
        console.error(
          "[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:",
          parseError,
        );
        credential = applicationDefault();
      }
    } else {
      credential = applicationDefault();
      console.log("[Firebase Admin] Using default application credentials");
    }

    initializeApp({
      credential,
      projectId: firebaseConfig.projectId,
    });
  }
  console.log("Admin Project ID:", getApp().options.projectId);
} catch (e) {
  console.error("[Firebase Admin] Critical Init failed:", e);
}

const databaseId =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== "(default)"
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

// Removed global update-rules app

console.log("[Firebase Admin] Using Database ID:", databaseId || "(default)");
console.log("[Firebase Admin] Project ID:", firebaseConfig.projectId);

let adminDb: any;
try {
  // Use the default app's firestore
  const app = getApp();
  adminDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  console.log(
    `[Firebase Admin] Firestore instance created for database: ${databaseId || "(default)"}`,
  );

  // Test connection immediately
  adminDb
    .collection("health_check")
    .limit(1)
    .get()
    .then(() => console.log("[Firebase Admin] Connection test successful"))
    .catch((err: any) => {
      console.error("[Firebase Admin] Connection test failed:", err.message);
    });

  // Test Gemini AI Connectivity
  if (process.env.GEMINI_API_KEY || process.env.LEAD_SCORER_API_KEY) {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.LEAD_SCORER_API_KEY || "";
    const aiTest = new GoogleGenAI({ apiKey });
    aiTest.models
      .generateContent({
        model: "gemini-1.5-flash",
        contents: "stability_test_ping",
      })
      .then(() => console.log("[Gemini AI] Connection test successful"))
      .catch((err) =>
        console.warn(
          "[Gemini AI] Connection test failed. AI features may be unavailable.",
          err.message,
        ),
      );
  }
} catch (e) {
  console.error("[Firebase Admin] Firestore critical init failed:", e);
}

// Initialize AI
const apiKey = process.env.LEAD_SCORER_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn(
    "[Warning] No Gemini API key found. Please set LEAD_SCORER_API_KEY in your environment variables.",
  );
}
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key-to-prevent-crash" });

async function logSystemError(
  type: string,
  message: string,
  details: any = {},
  userId?: string,
) {
  console.error(`[Error][${type}] ${message}`, details);
  try {
    if (adminDb) {
      await adminDb.collection("logs").add({
        type: `system_error_${type}`,
        message,
        details:
          typeof details === "object"
            ? JSON.stringify(details, null, 2)
            : String(details),
        createdAt: FieldValue.serverTimestamp(),
        userId: userId || "system",
        path: details.path || null,
      });
    }
  } catch (e: any) {
    console.error(
      "[Logging Failed] Could not write to logs collection:",
      e.message,
    );
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  // ── SEO Infrastructure ─────────────────────────────────────────────────────

  // GET /robots.txt — focus crawl budget on public money pages only
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain");
    res.send(
      [
        "User-agent: *",
        "Allow: /",
        "Allow: /intercept/",
        "Disallow: /portal/",
        "Disallow: /scraper/",
        "Disallow: /inbox",
        "Disallow: /crm",
        "Disallow: /logs",
        "Disallow: /api/",
        "Disallow: /privacy",
        "",
        `Sitemap: https://bepreemptly.com/sitemap.xml`,
      ].join("\n"),
    );
  });

  // GET /sitemap.xml — auto-generated from all pSEO slugs; submit to Search Console
  app.get("/sitemap.xml", (_req, res) => {
    const BASE = "https://bepreemptly.com";
    const now = new Date().toISOString();
    // All pSEO slugs — dynamically generated from src/data/pseo.ts
    const urlNodes = [
      // Homepage — highest priority
      `<url><loc>${BASE}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      // intercept pages
      ...pseoData.map(
        (niche) =>
          `<url><loc>${BASE}/intercept/${niche.slug}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>`,
      ),
    ];

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes.join("\n")}\n</urlset>`,
    );
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // POST /api/report-error - Frontend error reporting
  app.post("/api/report-error", express.json(), async (req, res) => {
    try {
      const { error, stack, context, userId } = req.body;
      await logSystemError("frontend", error, { stack, ...context }, userId);
      res.json({ success: true });
    } catch {
      res.status(500).end();
    }
  });

  app.post("/api/suggest-keywords", express.json(), async (req, res) => {
    try {
      const { clientName, idealCustomerProfile } = req.body;

      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const prompt = `You are a world-class marketing psychologist and lead generation expert.
      
      CLIENT: ${clientName || "A business"}
      IDEAL CUSTOMER PROFILE: ${idealCustomerProfile || "General commercial intent"}
      
      TASK: Based STRICTLY on the Ideal Customer Profile (IDP) provided above, suggest 15 high-intent "trigger phrases" or "active search keywords". 
      
      THINK: What EXACTLY would this specific persona type into a search bar if they were desperate for a solution? Avoid generic phrases. Prioritize specific pain points (e.g., "how to fix X", "alternative to Y that isn't Z", "recommendation for niche industry A").
      
      Return ONLY a valid JSON array of strings.
      Format: ["keyphrase1", "keyphrase2", ...]`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 1500,
          temperature: 0.7,
        },
      });

      const responseText = aiResponse.text || "[]";
      const cleanedText = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const keywords = JSON.parse(cleanedText);

      res.json({ keywords });
    } catch (error: any) {
      console.error("[API] Keyword suggestion failed:", error);
      const status = error.status || 900;
      res.status(status).json({
        error: error.message || "Failed to suggest keywords",
        code: status === 429 ? "QUOTA_EXCEEDED" : "INTERNAL_ERROR",
      });
    }
  });

  app.post("/api/suggest-targets", express.json(), async (req, res) => {
    try {
      const { clientName, idealCustomerProfile, platforms } = req.body;

      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const prompt = `You are an expert digital detective and marketing strategist.
      
      CLIENT: ${clientName || "A business"}
      IDEAL CUSTOMER PROFILE: ${idealCustomerProfile || "General commercial intent"}
      SELECTED PLATFORMS: ${platforms?.join(", ") || "Reddit"}
      
      TASK: Based STRICTLY on the Ideal Customer Profile (IDP), identify specific communities (Targets) where this EXACT customer archetype discusses their problems.
      
      CRITICAL RELEVANCE: Look for niche "watering holes" rather than generic broad categories. 
      If the IDP mentions "B2B SaaS owners", don't just suggest "r/business", suggest "r/SaaS" or "r/entrepreneur".
      
      RESTRICTION: You MUST ONLY suggest targets for the platforms listed in "SELECTED PLATFORMS". 
      - If Reddit is selected: Suggest specific subreddits (e.g., "Entrepreneur", "reactjs").
      - If Stack Overflow is selected: Suggest specific technical tags (e.g., "javascript", "python").
      
      Return ONLY a valid JSON array of strings.
      Format: ["target1", "target2", ...]`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash",
        contents: prompt,
        config: {
          maxOutputTokens: 1500,
          temperature: 0.7,
        },
      });

      const responseText = aiResponse.text || "[]";
      const cleanedText = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const targets = JSON.parse(cleanedText);

      res.json({ targets });
    } catch (error: any) {
      console.error("[API] Target suggestion failed:", error);
      const status = error.status || 500;
      res.status(status).json({
        error: error.message || "Failed to suggest targets",
        code: status === 429 ? "QUOTA_EXCEEDED" : "INTERNAL_ERROR",
      });
    }
  });

  const rssCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  app.get("/api/reddit/:subreddit", async (req, res) => {
    try {
      const { subreddit } = req.params;

      if (!subreddit || subreddit.trim() === "") {
        return res.status(400).json({ error: "Subreddit name is required" });
      }

      const cacheKey = subreddit.trim().toLowerCase();
      if (rssCache.has(cacheKey)) {
        const cached = rssCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log(`[RSS Cache] Serving ${cacheKey} from cache`);
          return res.json(cached.data);
        }
      }

      // Use RSS feed via rss2json to bypass Reddit's strict IP blocking
      const rssUrl = encodeURIComponent(
        `https://www.reddit.com/r/${subreddit.trim()}/new.rss`,
      );

      const response = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`,
      );

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`RSS API Error (${response.status}):`, responseText);
        return res.status(response.status).json({
          error: `RSS Service Error: ${response.status}`,
          details: responseText,
        });
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(
          "Failed to parse RSS API response as JSON:",
          responseText.substring(0, 500),
        );
        return res
          .status(500)
          .json({
            error: "RSS Service returned invalid JSON",
            details: responseText.substring(0, 200),
          });
      }

      if (data.status !== "ok") {
        console.error("RSS2JSON returned non-ok status:", data);
        return res.status(500).json({
          error: "Failed to parse RSS feed",
          details: data.message || "Unknown RSS error",
        });
      }

      const items = data.items || [];

      // Map the RSS output to match the exact frontend data structure
      const mappedPosts = items.map((item: any, index: number) => {
        let permalink = item.link || "";
        try {
          permalink = new URL(item.link).pathname;
        } catch (e) {
          permalink = permalink.replace("https://www.reddit.com", "");
        }

        const rawContent = item.content || item.description || "";

        return {
          data: {
            index,
            title: item.title || "",
            selftext: rawContent.replace(/<[^>]*>?/gm, ""),
            author: (item.author || "").replace("/u/", ""),
            permalink: permalink,
            pubDate: item.pubDate,
          },
        };
      });

      // Only process posts from the last 48 hours to ensure they are "recent"
      const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
      const recentPosts = mappedPosts.filter((post: any) => {
        const postDate = new Date(post.data.pubDate).getTime();
        return postDate > fortyEightHoursAgo;
      });

      rssCache.set(cacheKey, { data: recentPosts, timestamp: Date.now() });
      return res.json(recentPosts);
    } catch (error) {
      console.error("Error fetching from RSS API:", error);
      res.status(500).json({ error: "Failed to fetch from RSS" });
    }
  });

  // ===============================================================
  // Client Portal API (Unauthenticated - uses Admin SDK)
  // ===============================================================

  // GET /api/portal/:token - Fetch scraper info + pushed leads
  app.get("/api/portal/:token", async (req, res) => {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const { token } = req.params;
    try {
      if (!token || token.length < 10) {
        return res.status(400).json({ error: "Invalid portal token" });
      }

      // Optimization: Try to get scraper data from in-memory cache first
      let portalInfo = portalTokenCache.get(token);
      
      // Fallback to Firestore if not in cache (e.g. server just restarted or scraper is newly active)
      if (!portalInfo) {
        console.log(`[Cache Miss] Fetching portal info from Firestore for token: ${token.substring(0, 8)}...`);
        const scrapersSnap = await adminDb
          .collection("scrapers")
          .where("portalToken", "==", token)
          .get();

        if (scrapersSnap.empty) {
          return res.status(404).json({ error: "Portal not found" });
        }

        const group = scrapersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        portalInfo = {
          scraperIds: group.map(s => s.id),
          primaryScraper: group[0],
          userId: group[0].userId,
          clientName: group[0].clientName || "Client",
          isPaid: group.some(s => s.isPaid === true),
          isAiEnabled: group.some(s => s.isAiEnabled === true),
          scrapers: group.map(s => ({
            id: s.id,
            name: s.name,
            clientName: s.clientName,
            portalSetupCompleted: s.portalSetupCompleted,
            isAiEnabled: s.isAiEnabled,
            trialLimit: s.trialLimit
          }))
        };
        // Add to cache for subsequent requests
        portalTokenCache.set(token, portalInfo);
      }

      const { scraperIds, primaryScraper, isPaid, isAiEnabled, scrapers } = portalInfo;

      // Fetch leads for ALL matching scrapers (using in operator for efficiency)
      // Firestore 'in' query has a limit of 30, which should be plenty for scrapers per client.
      // If we exceed 30, we might need multiple queries.
      const leadsSnap = await adminDb
        .collection("leads")
        .where("scraperId", "in", scraperIds)
        .where("pushedToPortal", "==", true)
        .limit(100)
        .get();

      const leads = leadsSnap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          postTitle: data.postTitle,
          postContent: data.postContent || "",
          postUrl: data.postUrl,
          postAuthor: data.postAuthor,
          score: data.score,
          reason: data.reason,
          platform: data.platform,
          createdAt:
            data.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
          clientViewCount: data.clientViewCount || 0,
          clientFeedback: data.clientFeedback || "",
          engagementOutcome: data.engagementOutcome || "none",
        };
      });

      // Sort by createdAt desc
      leads.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // Filter out leads that the client has deleted (but keep them in DB for admin)
      const activeLeads = leads.filter((l: any) => l.status !== "deleted");

      // Aggregate counts or summary data
      const trialLimit = primaryScraper.trialLimit || 10;

      res.json({
        clientName: portalInfo.clientName,
        scraperName: scrapers.map((s: any) => s.name).join(", "),
        totalLeads: activeLeads.length,
        trialLimit: trialLimit,
        isPaid: isPaid,
        isAiEnabled: isAiEnabled,
        leads: activeLeads,
        setupCompleted: scrapers.some(
          (s: any) => s.portalSetupCompleted === true,
        ),
        scrapers: scrapers,
      });
    } catch (error: any) {
      await logSystemError("portal_fetch", "Failed to fetch portal", {
        error: error.message,
        stack: error.stack,
        token: token,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/generate-comment/:leadId - On-demand AI comment generation
  app.post(
    "/api/portal/:token/generate-comment/:leadId",
    express.json(),
    async (req, res) => {
      const { token, leadId } = req.params;
      try {
        // 1. Verify Portal Token via Cache
        let portalInfo = portalTokenCache.get(token);
        if (!portalInfo) {
          // One-shot fallback
          const snap = await adminDb.collection("scrapers").where("portalToken", "==", token).get();
          if (snap.empty) return res.status(403).json({ error: "Unauthorized portal access" });
          const group = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          portalInfo = {
            scraperIds: group.map(s => s.id),
            primaryScraper: group[0],
            userId: group[0].userId,
            clientName: group[0].clientName || "Client",
            isPaid: group.some(s => s.isPaid === true),
            isAiEnabled: group.some(s => s.isAiEnabled === true),
            scrapers: group.map(s => ({ id: s.id, name: s.name }))
          } as any;
          portalTokenCache.set(token, portalInfo);
        }

        // 2. Fetch Lead
        const leadSnap = await adminDb.collection("leads").doc(leadId).get();
        if (!leadSnap.exists) {
          return res.status(404).json({ error: "Match not found" });
        }
        const leadData = leadSnap.data();

        // 3. Find the specific monitor for this lead using portalInfo sub-scrapers
        const scraper = portalInfo.scrapers.find((s: any) => s.id === leadData.scraperId);
        if (!scraper) {
          return res
            .status(403)
            .json({ error: "Monitor not found for this match" });
        }

        // 4. Check if AI is enabled by the provider
        if (!scraper.isAiEnabled) {
          return res
            .status(403)
            .json({
              error:
                "AI Power-ups are disabled for this portal. Please contact your provider.",
            });
        }

        // 5. Build the Generation Prompt
        // Philosophy: Be the smartest person in the thread, not a sales rep.
        // The comment must FIRST earn trust through real expertise, THEN softly signal the business.
        const toneGuide =
          scraper.clientTone === "professional"
            ? "Direct, authoritative, and precise. Assume the reader is smart. No corporate fluff, no pep-talk language."
            : scraper.clientTone === "technical"
              ? "Peer-to-peer, technical depth. Skip the basics — assume competence. Use correct terminology, acknowledge trade-offs."
              : "Warm, conversational, and genuinely helpful. Sound like a knowledgeable friend, not a consultant.";

        const prompt = `You are a seasoned practitioner and genuine expert in the field of "${scraper.clientSells || "professional services"}". You are not a marketer. You are someone who has done this work for years and can speak with real authority.

YOUR CONTEXT (use to shape your perspective and expertise — do NOT advertise or pitch):
- Your speciality: ${scraper.clientSells || "professional services"}
- What you actually do day-to-day: ${scraper.clientDoes || "Deep hands-on work solving real problems in this industry."}
- Operating as: ${scraper.isSoloFreelancer ? "an independent specialist" : `a team at ${scraper.clientName || "your company"}`}

THE POST YOU ARE RESPONDING TO:
Title: "${leadData.postTitle}"
Content: ${leadData.postContent ? leadData.postContent.substring(0, 1500) : "(No body — respond to the title alone)"}

YOUR MISSION:
Write a substantive, helpful comment that makes the original poster feel like they just got advice from someone who truly knows this space — not someone trying to sell them something.

STRUCTURE YOUR RESPONSE IN 4 PARTS (write as continuous flowing prose, no labels, no bullet points):

PART 1 — DIAGNOSE (2-3 sentences):
Directly address the specific pain, question, or frustration raised. Show you actually read and understood the nuances of what they said. Call out the real underlying issue if there is one — the thing they might not have articulated perfectly but that any expert would immediately recognise. Be specific to THEIR situation, not generic.

PART 2 — THE MEAT (3-5 sentences):
This is the core of your response. Give genuinely useful, actionable insight. Include at least ONE of the following:
  - A "the thing most people miss here is..." observation
  - A concrete step, framework, or mental model they can apply immediately
  - A common mistake or misconception you've seen people make in this situation, and why
  - A nuance or trade-off that changes HOW they should think about this problem
Do not be vague. Specific > general. Real-world > theoretical.

PART 3 — DEPTH AND CREDIBILITY (2-3 sentences):
Add a layer of depth that signals real-world experience. This could be: edge cases to watch for, a counter-intuitive truth about this domain, something that works in theory but fails in practice, or a more advanced consideration they should factor in once they've handled the basics. This is what separates a genuine expert from someone who just read a blog post.

PART 4 — SOFT BRAND SIGNAL (1-2 sentences, ONLY if it fits naturally):
If it feels completely natural given what you just wrote, casually mention how your work relates. This must feel like a practitioner incidentally mentioning their background, not a pitch. The test: would this sentence feel out of place at a dinner party? If yes, cut it.
- GOOD: "This is honestly the exact kind of problem we run into most with [type of client we work with]."
- GOOD: "Happy to go deeper on [specific aspect] if useful — it's something we've had to work out the hard way."
- GOOD: "It's actually part of why [business name] focuses specifically on [relevant principle or approach]."
- BAD: "At ${scraper.clientName || "our company"}, we offer..."
- BAD: Any sentence that could be copy-pasted into a LinkedIn ad.
- OMIT this part entirely if it doesn't fit — a forced mention destroys all the credibility you just built.

ABSOLUTE RULES:
- BANNED OPENERS: "Great question", "This is such a common issue", "I totally understand", "As someone who...", "In my experience..." — these are hollow filler. Start with substance.
- Do NOT start the comment with the word "I"
- Do NOT use bullet points or numbered lists — write in natural flowing prose
- Do NOT use corporate speak: "leverage", "synergy", "circle back", "our approach", "our process", "feel free to reach out", "as a company"
- BANNED PHRASES: "At ${scraper.clientName || "our company"}, we...", "we specialize in", "our team"
- TONE: ${toneGuide}
- LENGTH: Aim for 150–250 words. Too short = unhelpful. Too long = walls of text.

Return ONLY the comment text. No labels, no intro, no quotes around it.`;

        const aiResponse = await ai.models.generateContent({
          model: "gemini-3-flash",
          contents: prompt,
          config: {
            maxOutputTokens: 3000,
            temperature: 0.75,
          },
        });

        const comment =
          aiResponse.text ||
          "I'm sorry, I couldn't generate a comment at this time.";

        res.json({ comment: comment.trim() });
      } catch (error: any) {
        await logSystemError("portal_ai_comment", "Comment generation failed", {
          error: error.message,
          stack: error.stack,
          token,
          leadId,
        });
        res.status(500).json({ error: "Failed to generate AI comment" });
      }
    },
  );

  // POST /api/portal/:token/setup - Client completes portal setup
  app.post("/api/portal/:token/setup", express.json(), async (req, res) => {
    const { token } = req.params;
    try {
      const {
        isSoloFreelancer,
        clientBusiness,
        clientSells,
        clientDoes,
        clientTone,
      } = req.body;

      const portalInfo = await getPortalInfo(token);
      if (!portalInfo) {
        return res.status(404).json({ error: "Portal not found" });
      }

      const batch = adminDb.batch();
      portalInfo.scraperIds.forEach((id) => {
        const ref = adminDb.collection("scrapers").doc(id);
        batch.update(ref, {
          isSoloFreelancer,
          clientBusiness,
          clientSells,
          clientDoes,
          clientTone,
          portalSetupCompleted: true,
        });
      });

      await batch.commit();
      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_setup", "Setup failed", {
        error: error.message,
        stack: error.stack,
        token,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/delete/:leadId - Client deletes a lead
  app.post("/api/portal/:token/delete/:leadId", async (req, res) => {
    const { token, leadId } = req.params;
    try {
      const portalInfo = await getPortalInfo(token);
      if (!portalInfo) {
        return res.status(404).json({ error: "Portal not found" });
      }

      await adminDb.collection("leads").doc(leadId).update({
        status: "deleted",
        clientDeletedAt: new Date().toISOString(),
      });

      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_delete_lead", "Error deleting lead", {
        error: error.message,
        stack: error.stack,
        token,
        leadId,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/click/:leadId - Track lead click
  app.post("/api/portal/:token/click/:leadId", async (req, res) => {
    const { token, leadId } = req.params;
    try {
      const portalInfo = await getPortalInfo(token);
      if (!portalInfo) {
        return res.status(404).json({ error: "Portal not found" });
      }

      const scraperIds = portalInfo.scraperIds;

      // Verify lead belongs to this scraper
      const leadRef = adminDb.collection("leads").doc(leadId);
      const leadSnap = await leadRef.get();
      if (
        !leadSnap.exists ||
        !scraperIds.includes(leadSnap.data()?.scraperId)
      ) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Increment per-lead click count
      await leadRef.update({
        clientViewCount: (leadSnap.data().clientViewCount || 0) + 1,
      });

      // Increment aggregate scraper click count
      const actualScraperId = leadSnap.data().scraperId;
      const actualScraperRef = adminDb.collection("scrapers").doc(actualScraperId);
      const actualScraperSnap = await actualScraperRef.get();

      if (actualScraperSnap.exists) {
        await actualScraperRef.update({
          totalClientClicks: (actualScraperSnap.data().totalClientClicks || 0) + 1,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_click_tracking", "Click tracking error", {
        error: error.message,
        stack: error.stack,
        token,
        leadId,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/feedback/:leadId - Submit feedback
  app.post(
    "/api/portal/:token/feedback/:leadId",
    express.json(),
    async (req, res) => {
      const { token, leadId } = req.params;
      try {
        const { feedback } = req.body;

        if (
          !feedback ||
          typeof feedback !== "string" ||
          feedback.length > 500
        ) {
          return res.status(400).json({ error: "Invalid feedback" });
        }

        const portalInfo = await getPortalInfo(token);
        if (!portalInfo) {
          return res.status(404).json({ error: "Portal not found" });
        }

        const scraperIds = portalInfo.scraperIds;

        const leadRef = adminDb.collection("leads").doc(leadId);
        const leadSnap = await leadRef.get();
        if (
          !leadSnap.exists ||
          !scraperIds.includes(leadSnap.data().scraperId)
        ) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        await leadRef.update({ clientFeedback: feedback });
        res.json({ success: true });
      } catch (error: any) {
        await logSystemError("portal_feedback", "Feedback error", {
          error: error.message,
          stack: error.stack,
          token,
          leadId,
        });
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // POST /api/portal/:token/outcome/:leadId - Submit engagement outcome
  app.post(
    "/api/portal/:token/outcome/:leadId",
    express.json(),
    async (req, res) => {
      const { token, leadId } = req.params;
      try {
        const { outcome } = req.body;

        if (!outcome || typeof outcome !== "string") {
          return res.status(400).json({ error: "Invalid outcome" });
        }

        const portalInfo = await getPortalInfo(token);
        if (!portalInfo) {
          return res.status(404).json({ error: "Portal not found" });
        }

        const scraperIds = portalInfo.scraperIds;

        const leadRef = adminDb.collection("leads").doc(leadId);
        const leadSnap = await leadRef.get();
        if (
          !leadSnap.exists ||
          !scraperIds.includes(leadSnap.data().scraperId)
        ) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        await leadRef.update({ engagementOutcome: outcome });
        res.json({ success: true });
      } catch (error: any) {
        await logSystemError("portal_outcome", "Outcome tracking error", {
          error: error.message,
          stack: error.stack,
          token,
          leadId,
        });
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // GET /api/portal/:token/chat/stream - SSE Chat Stream
  app.get("/api/portal/:token/chat/stream", async (req, res) => {
    const { token } = req.params;
    console.log(
      `[SSE] Client connecting to chat stream. Token: ${token?.substring(0, 8)}...`,
    );

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send retry interval and initial heartbeat
    res.write("retry: 3000\n\n");
    res.write(": heartbeat\n\n");

    // Keep-alive heartbeat every 20 seconds to prevent proxy timeouts
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 20000);

    try {
      if (!adminDb) {
        throw new Error("Firestore Admin SDK not initialized");
      }

      const portalInfo = await getPortalInfo(token);

      if (!portalInfo) {
        console.warn(`[SSE] Portal not found for token: ${token}`);
        res.write('event: error\ndata: {"error":"Portal not found"}\n\n');
        clearInterval(heartbeat);
        return res.end();
      }

      const unsubscribe = adminDb
        .collection("portal_chats")
        .doc(token)
        .collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(
          (snapshot) => {
            const messages = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                text: data.text,
                sender: data.sender,
                isRead: data.isRead,
                timestamp:
                  data.timestamp?.toDate?.()?.toISOString() ||
                  new Date().toISOString(),
                fileData: data.fileData,
                fileName: data.fileName,
                fileType: data.fileType,
              };
            });
            res.write(
              `data: ${JSON.stringify({ type: "messages", messages })}\n\n`,
            );
          },
          (error) => {
            console.error("[SSE] Snapshot error:", error);
            res.write(`event: error\ndata: {"error":"${error.message}"}\n\n`);
          },
        );

      const unsubscribeRooms = adminDb
        .collection("portal_chats")
        .doc(token)
        .onSnapshot((doc) => {
          if (doc.exists) {
            const data = doc.data();
            res.write(
              `data: ${JSON.stringify({ type: "meta", adminTyping: !!data?.adminTyping })}\n\n`,
            );
          }
        });

      req.on("close", () => {
        console.log(
          `[SSE] Client disconnected from chat stream. Token: ${token?.substring(0, 8)}...`,
        );
        unsubscribe();
        unsubscribeRooms();
        clearInterval(heartbeat);
      });
    } catch (error: any) {
      console.error("[SSE] Stream setup error:", error);
      res.write(
        `event: error\ndata: {"error":"${error.message || "Internal server error"}"}\n\n`,
      );
      clearInterval(heartbeat);
      res.end();
    }
  });

  // POST /api/portal/:token/chat - Send Chat Message
  app.post(
    "/api/portal/:token/chat",
    express.json({ limit: "10mb" }),
    async (req, res) => {
      const { token } = req.params;
      try {
        const { text, sender, fileData, fileName, fileType } = req.body;

        if ((!text || typeof text !== "string") && !fileData) {
          return res.status(400).json({ error: "Invalid message" });
        }

        const safeSender = sender === "admin" ? "admin" : "client";

        const portalInfo = await getPortalInfo(token);

        if (!portalInfo) {
          return res.status(404).json({ error: "Portal not found" });
        }

        const clientName = portalInfo.clientName;
        const userId = portalInfo.userId;

        await adminDb
          .collection("portal_chats")
          .doc(token)
          .collection("messages")
          .add({
            text: text || "",
            sender: safeSender,
            isRead: false,
            timestamp: FieldValue.serverTimestamp(),
            ...(fileData ? { fileData, fileName, fileType } : {}),
          });

        const snippet = text
          ? text.substring(0, 50)
          : fileName
            ? `Attachment: ${fileName}`
            : "Attachment";

        await adminDb
          .collection("portal_chats")
          .doc(token)
          .set(
            {
              lastMessage: snippet,
              lastMessageAt: FieldValue.serverTimestamp(),
              lastSender: safeSender,
              clientName: clientName,
              userId: userId,
              hasUnreadAdmin: safeSender === "client",
              hasUnreadClient: safeSender === "admin",
              // Optimization: Update lastSeen on every message send
              ...(safeSender === "client" ? { clientLastSeen: FieldValue.serverTimestamp() } : {}),
            },
            { merge: true },
          );

        if (safeSender === "client") {
          await adminDb.collection("logs").add({
            type: "chat_message",
            message: `New message from ${clientName}: "${text.substring(0, 40)}${text.length > 40 ? "..." : ""}"`,
            userId: userId,
            createdAt: FieldValue.serverTimestamp(),
            token: token,
          });
        }

        res.json({ success: true });
      } catch (error: any) {
        await logSystemError("portal_chat", "Chat send error", {
          error: error.message,
          stack: error.stack,
          token,
        });
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // POST /api/portal/:token/chat/typing - Send Typing Status
  app.post(
    "/api/portal/:token/chat/typing",
    express.json(),
    async (req, res) => {
      const { token } = req.params;
      try {
        const { typing, sender } = req.body;
        const safeSender = sender === "admin" ? "admin" : "client";
        const typingField =
          safeSender === "admin" ? "adminTyping" : "clientTyping";

        await adminDb
          .collection("portal_chats")
          .doc(token)
          .set(
            {
              [typingField]: Boolean(typing),
            },
            { merge: true },
          );

        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // DELETE /api/portal/:token/chat/messages/:msgId - Delete single message
  app.delete("/api/portal/:token/chat/messages/:msgId", async (req, res) => {
    const { token, msgId } = req.params;
    try {
      const portalInfo = await getPortalInfo(token);
      if (!portalInfo) {
        return res.status(404).json({ error: "Portal not found" });
      }

      await adminDb
        .collection("portal_chats")
        .doc(token)
        .collection("messages")
        .doc(msgId)
        .delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE /api/portal/:token/chat - Delete whole chat
  app.delete("/api/portal/:token/chat", async (req, res) => {
    const { token } = req.params;
    try {
      const portalInfo = await getPortalInfo(token);
      if (!portalInfo) {
        return res.status(404).json({ error: "Portal not found" });
      }

      // 1. Delete messages
      const msgsRef = adminDb
        .collection("portal_chats")
        .doc(token)
        .collection("messages");
      const msgsSnap = await msgsRef.get();
      const batch = adminDb.batch();
      msgsSnap.docs.forEach((d: any) => batch.delete(d.ref));
      await batch.commit();

      // 2. Delete room doc
      await adminDb.collection("portal_chats").doc(token).delete();

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/presence - Client online/offline heartbeat
  app.post("/api/portal/:token/presence", express.json(), async (req, res) => {
    const { token } = req.params;
    try {
      const { online } = req.body;

      const portalInfo = await getPortalInfo(token);
      if (!portalInfo) {
        return res.status(404).json({ error: "Portal not found" });
      }

      const clientName = portalInfo.clientName;
      const userId = portalInfo.userId;

      await adminDb
        .collection("portal_chats")
        .doc(token)
        .set(
          {
            clientLastSeen: FieldValue.serverTimestamp(),
            // Ensure the room doc always has identity fields for the Start Chat panel
            clientName,
            userId,
          },
          { merge: true },
        );

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on port ${PORT}`);

    // Start background scraper engine
    console.log("Starting background scraper engine...");
    setInterval(runBackgroundScrapers, 2 * 60 * 1000); // Check every 2 minutes (Balanced for responsiveness and cost)
    setTimeout(runBackgroundScrapers, 10000); // Run once after 10 seconds to allow server to fully start
  });
}

// Background Scraper Logic
// Phase 1.3: In-Memory Deduplication Cache
// This prevents redundant Firestore reads for the same posts across consecutive runs.
// Since RSS feeds are often the same for minutes at a time, this can save 90%+ in read costs.
const processedLeadsCache = new Set<string>();
const MAX_CACHE_SIZE = 5000;

function addToLeadCache(leadId: string) {
  if (processedLeadsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = processedLeadsCache.values().next().value;
    if (firstKey) processedLeadsCache.delete(firstKey);
  }
  processedLeadsCache.add(leadId);
}
// Phase 2.0: Smart error handling with exponential backoff.
// - After each consecutive failure, the scraper waits 2^N minutes (capped at 60 min)
//   before retrying, preventing rapid-fire failures from hammering external APIs.
// - After 5 consecutive failures, the scraper auto-pauses and logs a warning.
// - On a successful run, consecutiveErrors resets to 0.
const MAX_CONSECUTIVE_ERRORS = 5;
const MAX_BACKOFF_MINUTES = 60;

// Phase 2.1: Server-Side Scraper Cache using Real-Time Listener
// This replaces periodic polling (O(N) reads per minute) with O(1) change-based reads.
// This is a massive cost saver for long-running servers.
let activeScrapersCache: any[] = [];
let scrapersListenerStarted = false;
const inMemoryLastRun = new Map<string, number>();

// In-Memory Portal Token Cache to avoid redundant Firestore reads on every portal API call
// This maps portalToken -> { scraperIds, primaryScraper, userId, clientName, anyPaid }
interface PortalCacheInfo {
  scraperIds: string[];
  primaryScraper: any;
  userId: string;
  clientName: string;
  isPaid: boolean;
  isAiEnabled: boolean;
  scrapers: any[];
}
const portalTokenCache = new Map<string, PortalCacheInfo>();

function updatePortalTokenCache(scrapers: any[]) {
  const tokenGroups = new Map<string, any[]>();
  scrapers.forEach(s => {
    if (s.portalToken) {
      if (!tokenGroups.has(s.portalToken)) tokenGroups.set(s.portalToken, []);
      tokenGroups.get(s.portalToken)!.push(s);
    }
  });

  portalTokenCache.clear();
  tokenGroups.forEach((group, token) => {
    portalTokenCache.set(token, {
      scraperIds: group.map(s => s.id),
      primaryScraper: group[0],
      userId: group[0].userId,
      clientName: group[0].clientName || "Client",
      isPaid: group.some(s => s.isPaid === true),
      isAiEnabled: group.some(s => s.isAiEnabled === true),
      scrapers: group.map(s => ({
        id: s.id,
        name: s.name,
        clientName: s.clientName,
        portalSetupCompleted: s.portalSetupCompleted,
        isAiEnabled: s.isAiEnabled,
        trialLimit: s.trialLimit
      }))
    });
  });
  console.log(`[Background Engine] Portal token cache updated: ${portalTokenCache.size} portals indexed.`);
}

/**
 * Helper to fetch portal info from cache, or fallback to Firestore
 */
async function getPortalInfo(token: string): Promise<PortalCacheInfo | null> {
  if (!token) return null;
  
  // 1. Try Cache
  const cached = portalTokenCache.get(token);
  if (cached) return cached;
  
  // 2. Fallback to Firestore (Query by portalToken)
  try {
    const snap = await adminDb.collection("scrapers").where("portalToken", "==", token).get();
    if (snap.empty) return null;
    
    const group = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const info: PortalCacheInfo = {
      scraperIds: group.map(s => s.id),
      primaryScraper: group[0],
      userId: group[0].userId,
      clientName: group[0].clientName || "Client",
      isPaid: group.some(s => s.isPaid === true),
      isAiEnabled: group.some(s => s.isAiEnabled === true),
      scrapers: group.map(s => ({
        id: s.id,
        name: s.name,
        clientName: s.clientName,
        portalSetupCompleted: s.portalSetupCompleted,
        isAiEnabled: s.isAiEnabled,
        trialLimit: s.trialLimit
      }))
    };
    
    // Proactively cache it
    portalTokenCache.set(token, info);
    return info;
  } catch (error) {
    console.error(`[Portal Auth] Failed to verify token ${token}:`, error);
    return null;
  }
}

function startScrapersListener() {
  if (scrapersListenerStarted) return;
  console.log(
    "[Background Engine] Initializing server-side scraper listener...",
  );
  adminDb
    .collection("scrapers")
    .onSnapshot(
      (snapshot) => {
        const allScrapers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Filter out those for the execution engine cache (only active)
        activeScrapersCache = allScrapers.filter(s => s.status === "active");
        
        // Update the token lookup cache derived from ALL scrapers (active or paused)
        // to ensure portal lookups never hit Firestore.
        updatePortalTokenCache(allScrapers);

        console.log(
          `[Background Engine] Active scrapers updated: ${activeScrapersCache.length} trackers currently monitoring.`,
        );
      },
      (error) => {
        console.error("[Background Engine] Scraper listener failed:", error);
        scrapersListenerStarted = false; // Allow retry
      },
    );
  scrapersListenerStarted = true;
}

async function runBackgroundScrapers() {
  try {
    if (!scrapersListenerStarted) startScrapersListener();

    // Use the memory cache instead of hitting Firestore .get() every minute
    const currentScrapers = [...activeScrapersCache];

    if (currentScrapers.length === 0) return;

    console.log(
      `[Background Engine] Processing ${currentScrapers.length} active scrapers... ${new Date().toLocaleTimeString()}`,
    );

    for (const scraper of currentScrapers) {
      // Use in-memory tracker if available to avoid unnecessary DB reads/writes
      const lastRun =
        inMemoryLastRun.get(scraper.id) ||
        scraper.lastRunAt?.toMillis?.() ||
        scraper.createdAt?.toMillis?.() ||
        0;

      // Phase 2.0: Apply exponential backoff if the scraper has consecutive errors.
      // Normal interval + backoff penalty = effective cooldown between retries.
      const consecutiveErrors = scraper.consecutiveErrors || 0;
      const backoffMinutes =
        consecutiveErrors > 0
          ? Math.min(MAX_BACKOFF_MINUTES, Math.pow(2, consecutiveErrors))
          : 0;
      const effectiveInterval =
        (scraper.intervalMinutes + backoffMinutes) * 60 * 1000;
      const nextRun = lastRun + effectiveInterval;

      if (Date.now() >= nextRun) {
        if (consecutiveErrors > 0) {
          console.log(
            `[Background Engine] Retrying scraper: ${scraper.name} (attempt after ${consecutiveErrors} failures, backoff: ${backoffMinutes}min)`,
          );
        } else {
          console.log(
            `[Background Engine] Running scraper: ${scraper.name} (${scraper.platform || "reddit"}/${scraper.target || scraper.subreddit})`,
          );
        }
        try {
          await executeScraper(scraper);
          // Add a 5-second delay between scrapers to avoid rate limits across different platforms
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (err) {
          console.error(
            `[Background Engine] Error executing scraper ${scraper.id}:`,
            err,
          );
        }
      }
    }
  } catch (error) {
    console.error("[Background Engine] Error in background loop:", error);
  }
}

// Helper function to fetch Reddit posts directly (avoids self-HTTP calls)
async function fetchRedditPosts(subreddit: string, limit: number = 25) {
  const rssUrl = `https://www.reddit.com/r/${subreddit.trim()}/new.rss`;
  const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    console.log(`[Reddit RSS Fetch] Fetching via rss2json for r/${subreddit}`);
    const response = await fetch(rss2jsonUrl);

    if (!response.ok) {
      throw new Error(`RSS Service Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "ok") {
      throw new Error(data.message || "Unknown RSS error");
    }

    const items = data.items || [];

    const mappedPosts = items.map((item: any, index: number) => {
      let permalink = item.link || "";
      try {
        permalink = new URL(item.link).pathname;
      } catch (e) {
        permalink = permalink.replace("https://www.reddit.com", "");
      }

      const rawContent = item.content || item.description || "";

      return {
        data: {
          index,
          title: item.title || "",
          selftext: rawContent.replace(/<[^>]*>?/gm, ""), // strip HTML tags
          author: (item.author || "").replace("/u/", ""),
          permalink: permalink,
          pubDate: item.pubDate,
        },
      };
    });

    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
    const recentPosts = mappedPosts.filter((post: any) => {
      const postDate = new Date(post.data.pubDate).getTime();
      return postDate > fortyEightHoursAgo;
    });

    return recentPosts.slice(0, limit);
  } catch (error) {
    console.error(`[Reddit RSS Fetch] Failed:`, error);
    throw new Error(
      `Failed to fetch Reddit posts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Helper function to fetch Stack Overflow posts
async function fetchStackOverflowPosts(tag: string, limit: number = 25) {
  const rssUrl = `https://stackoverflow.com/feeds/tag?tagnames=${encodeURIComponent(tag.trim())}&sort=newest`;
  const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

  try {
    console.log(`[Stack Overflow Fetch] Fetching via rss2json for tag: ${tag}`);
    const response = await fetch(rss2jsonUrl);

    if (!response.ok) {
      throw new Error(`RSS Service Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "ok") {
      throw new Error(data.message || "Unknown RSS error");
    }

    const items = data.items || [];
    const mappedPosts = items.map((item: any, index: number) => {
      let permalink = item.link || "";
      try {
        const url = new URL(item.link);
        permalink = url.pathname + url.search;
      } catch (e) {
        permalink = permalink.replace("https://stackoverflow.com", "");
      }
      const rawContent = item.content || item.description || "";
      return {
        data: {
          index,
          title: item.title || "",
          selftext: rawContent.replace(/<[^>]*>?/gm, ""),
          author: item.author || "unknown",
          permalink: permalink,
          pubDate: item.pubDate,
        },
      };
    });

    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;
    const recentPosts = mappedPosts.filter(
      (post: any) => new Date(post.data.pubDate).getTime() > fortyEightHoursAgo,
    );
    return recentPosts.slice(0, limit);
  } catch (error) {
    console.error(
      `[Stack Overflow Fetch] Primary failed, trying direct:`,
      error,
    );
    try {
      const response = await fetch(rssUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/atom+xml, application/xml, text/xml",
        },
      });
      if (response.ok) {
        const xml = await response.text();
        const feed = await parser.parseString(xml);
        const items = feed.items || [];
        return items
          .map((item: any, index: number) => ({
            data: {
              index,
              title: item.title || "",
              selftext: (item.content || item.description || "").replace(
                /<[^>]*>?/gm,
                "",
              ),
              author: item.author || "unknown",
              permalink:
                item.link?.replace("https://stackoverflow.com", "") || "",
              pubDate: item.pubDate || item.isoDate,
            },
          }))
          .slice(0, limit);
      }
    } catch (directError) {
      console.error(`[Stack Overflow Fetch] Direct also failed:`, directError);
    }
    throw new Error(
      `Failed to fetch Stack Overflow RSS: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function executeScraper(scraper: any) {
  try {
    let rawPosts = [];
    if (scraper.platform === "stackoverflow") {
      rawPosts = await fetchStackOverflowPosts(
        scraper.target || scraper.subreddit,
        50,
      );
    } else {
      // Add a small random delay before Reddit fetch to avoid being flagged as a bot
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 + Math.random() * 2000),
      );
      rawPosts = await fetchRedditPosts(
        scraper.target || scraper.subreddit,
        50,
      );
    }

    if (!rawPosts || rawPosts.length === 0) return;

    const keywords = (scraper.keyword || "")
      .toLowerCase()
      .split(",")
      .map((k: string) => k.trim())
      .filter((k: string) => k !== "");

    // Phase 1.2: Build the full postUrl for each raw post, then generate deterministic
    // document IDs. We check Firestore with a single .getAll() batched read instead
    // of a 1000-lead query scan, making deduplication O(N posts) not O(existing leads).
    const rawPostsWithUrls = rawPosts.map((post: any) => {
      let postUrl = "";
      if (scraper.platform === "stackoverflow") {
        postUrl = `https://stackoverflow.com${post.data.permalink}`;
      } else {
        postUrl = `https://www.reddit.com${post.data.permalink}`;
      }
      const leadId = generateLeadId(postUrl, scraper.id);
      return { ...post, postUrl, leadId };
    });

    // Phase 1.3: Apply Date-Fence Filtering FIRST (Massive Cost Saver)
    // We only care about posts newer than the most recent of (Firestore lastRun OR Memory lastRun)
    // To save thousands of reads, we only check Firestore for posts newer than the last run.
    const firestoreLastRun = scraper.lastRunAt?.toMillis?.() || scraper.createdAt?.toMillis?.() || 0;
    const memoryLastRun = inMemoryLastRun.get(scraper.id) || 0;
    const lastRunTime = Math.max(firestoreLastRun, memoryLastRun);
    
    const bufferMs = 15 * 60 * 1000; // 15-minute safety buffer for RSS propagation drift
    
    const freshPosts = rawPostsWithUrls.filter(post => {
      if (!post.data.pubDate) return true; // If no date, play it safe and check
      const pubTime = new Date(post.data.pubDate).getTime();
      return pubTime > (lastRunTime - bufferMs);
    });

    if (freshPosts.length === 0) {
      // Keep the gate moving forward even if feed is old or static
      await updateScraperLastRun(scraper, true); 
      return;
    }

    // Phase 1.4: Check In-Memory Cache (Cheap deduplication)
    const uncachedPosts = freshPosts.filter(
      (p) => !processedLeadsCache.has(p.leadId),
    );

    if (uncachedPosts.length === 0) {
      // All fresh posts have already been processed in this server session
      // Persistent silence is critical to keep the Date-Fence updated in Firestore
      // so that restarts don't trigger re-scans of the whole feed.
      await updateScraperLastRun(scraper, true);
      return;
    }

    // Phase 1.5: Batch-check existence for remaining posts: getAll() returns stubs for missing docs (cheap read)
    const leadsRef = adminDb.collection("leads");
    const docRefs = uncachedPosts.map((p: any) => leadsRef.doc(p.leadId));
    const existingDocs =
      docRefs.length > 0 ? await adminDb.getAll(...docRefs) : [];
    const existingIds = new Set(
      existingDocs.filter((d: any) => d.exists).map((d: any) => d.id),
    );

    // Update memory cache with existing IDs from Firestore so we don't check them again
    existingIds.forEach((id: any) => addToLeadCache(String(id)));

    // Only posts whose hash-ID does not yet exist in Firestore are truly new
    const newPosts = uncachedPosts.filter(
      (post: any) => !existingIds.has(post.leadId),
    );

    if (newPosts.length === 0) {
      console.log(`[Background Engine] No new posts found for ${scraper.name}`);
      // Persist the run time even if no new leads found to keep the gate closed
      await updateScraperLastRun(scraper, true); 
      return;
    }

    // AI Scoring in Batches (max 20 posts per batch to avoid token limits/hallucinations)
    const BATCH_SIZE = 20;
    let allScoredData: any[] = [];

    for (let i = 0; i < newPosts.length; i += BATCH_SIZE) {
      const batch = newPosts.slice(i, i + BATCH_SIZE);
      const minimizedData = batch.map((post: any) => ({
        index: post.data.index,
        title: post.data.title,
        author: post.data.author || "the author",
        content: post.data.selftext.substring(0, 500), // Limit content length per post
      }));

      const prompt = `You are an expert lead generation analyst. I am providing a JSON array of ${minimizedData.length} recent social media posts. 
      
      YOUR CLIENT: ${scraper.clientName || scraper.name}
      YOUR CLIENT'S BUSINESS PROFILE:
      - ${scraper.isSoloFreelancer ? "Type: Solo Freelancer" : "Type: Company/Agency"}
      - Business Name/Identity: ${scraper.clientBusiness || scraper.clientName || "The Client"}
      - What they sell: ${scraper.clientSells || "Professional services"}
      - What they do/Value prop: ${scraper.clientDoes || "High-quality solutions"}
      - Preferred outreach tone: ${scraper.clientTone || "Friendly"}

      YOUR SPECIFIC TARGET (Ideal Customer Profile): ${scraper.idealCustomerProfile || scraper.leadDefinition || "General commercial intent"}
      
      Evaluate EACH AND EVERY post based on this target definition. 
     
      Look for these specific signals of a high-quality opportunity:
      1. Explicit requests for recommendations or help.
      2. Complaints about current solutions (pain points).
      3. Questions about how to solve a specific problem that the client solves.
      4. Users asking "What is the best [product/service] for...?"
      
      CRITICAL: You MUST return a score for EVERY post in the input array. Do not skip any.
      
      Score the intent from 1 to 10:
      - 1-3: No match or very weak signal.
      - 4-6: Potential interest, but vague or early stage.
      - 7-10: Strategic Match. The user is actively seeking a solution right now.
      
      If the score is >= 7, provide a clear, one-sentence "Match rationale" that explains exactly why this is a good opportunity for the client, focusing on their value proposition: "${scraper.clientDoes}".
      
      Return ONLY a valid JSON array of objects. 
      Format: [{ 
        "index": number, 
        "score": number, 
        "reason": "string", 
        "matchRationale": "string",
        "isLead": boolean
      }]
      
      Input Data:
      ${JSON.stringify(minimizedData)}`;

      let scoredBatch = [];
      try {
        if (!apiKey) throw new Error("No Gemini API key configured");

        const aiResponse = await ai.models.generateContent({
          model: "gemini-3-flash",
          contents: prompt,
        });

        const responseText = aiResponse.text || "[]";
        const cleanedText = responseText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        scoredBatch = JSON.parse(cleanedText);
      } catch (aiError: any) {
        if (aiError.status === 429) {
          console.error(
            `[Background Engine] [QUOTA EXCEEDED] AI Scoring failed for ${scraper.name}. Please check AI Studio spend cap.`,
          );
        } else {
          console.error(
            `[Background Engine] AI Scoring failed for batch in ${scraper.name}:`,
            aiError.message || aiError,
          );
        }

        // Fallback: just use keyword matching if AI fails
        scoredBatch = minimizedData.map((post: any) => ({
          index: post.index,
          score: 5,
          reason:
            aiError.status === 429
              ? "AI Quota Exceeded, fallback to keyword match"
              : "AI scoring failed, fallback to keyword match",
          isLead: false,
          whatsappMessage: "",
        }));
      }
      allScoredData = [...allScoredData, ...scoredBatch];
    }

    let newLeadsCount = 0;
    const batchWrite = adminDb.batch(); // Use batch writes for efficiency
    let batchOperations = 0;

    for (const scoreObj of allScoredData) {
      const post = newPosts.find((p: any) => p.data.index === scoreObj.index);
      if (!post) continue;

      const title = post.data.title || "";
      const selftext = post.data.selftext || "";
      const titleLower = title.toLowerCase();
      const selftextLower = selftext.toLowerCase();

      const hasKeyword =
        keywords.length === 0 ||
        keywords.some(
          (kw: string) => titleLower.includes(kw) || selftextLower.includes(kw),
        );

      const isAiLead = scoreObj.isLead === true || scoreObj.score >= 7;

      if (hasKeyword || isAiLead) {
        // Phase 1.2: Use the pre-computed hash ID for the document — guarantees
        // idempotency; a second write of the same post is a no-op.
        const postUrl = post.postUrl;
        const leadDocRef = adminDb.collection("leads").doc(post.leadId);

        // Client Alert Template for WhatsApp
        const matchRationale =
          scoreObj.matchRationale ||
          scoreObj.reason ||
          "General match detected.";
        const whatsappTemplate = `*New Strategic Match Opportunity!* 🎯\n\n*Topic:* ${title.substring(0, 100)}${title.length > 100 ? "..." : ""}\n\n*Rationale:* ${matchRationale}\n\n*Action:* Review and interact with this match in your Growth Portal:\n[PORTAL_URL]`;

        const portalUrl = process.env.VITE_APP_URL
          ? `${process.env.VITE_APP_URL}/portal/${scraper.portalToken}`
          : `https://intent-first-hunter.web.app/portal/${scraper.portalToken}`;
        const finalWhatsappMessage = whatsappTemplate.replace(
          /\[PORTAL_URL\]/gi,
          portalUrl,
        );

        // Use set() with the deterministic ID — duplicates are overwritten harmlessly
        batchWrite.set(
          leadDocRef,
          {
            scraperId: scraper.id,
            platform: scraper.platform || "reddit",
            target: scraper.target || scraper.subreddit || "",
            subreddit: scraper.subreddit || "", // Keep for backward compatibility
            keyword: scraper.keyword,
            postTitle: title.substring(0, 500),
            postUrl: postUrl.substring(0, 500),
            postAuthor: (post.data.author || "unknown").substring(0, 100),
            postContent: selftext.substring(0, 10000),
            score: Math.max(1, Math.min(10, scoreObj.score || 5)), // Ensure score is 1-10
            reason: (scoreObj.reason || "").substring(0, 2000),
            status: "new",
            whatsappMessage: finalWhatsappMessage.substring(0, 5000),
            createdAt: FieldValue.serverTimestamp(),
            pubDate: post.data.pubDate || null,
            userId: scraper.userId,
            // Snapshot context at time of generation
            clientBusiness: scraper.clientBusiness || null,
            isSoloFreelancer: scraper.isSoloFreelancer || false,
          },
          { merge: true },
        );
        newLeadsCount++;
        batchOperations++;

        // Add to cache so we don't process it again
        addToLeadCache(post.leadId);

        // Firestore batches are limited to 500 operations
        if (batchOperations >= 400) {
          await batchWrite.commit();
          batchOperations = 0;
        }
      }
    }

    if (batchOperations > 0) {
      await batchWrite.commit();
    }

    await updateScraperLastRun(scraper, true);

    // Phase 2.0: Clear consecutive errors on success — the scraper is healthy again.
    if ((scraper.consecutiveErrors || 0) > 0) {
      await adminDb.collection("scrapers").doc(scraper.id).update({
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null,
      });
      console.log(
        `[Background Engine] ✓ Scraper ${scraper.name} recovered after ${scraper.consecutiveErrors} failures. Error state cleared.`,
      );
    }

    // Log completion
    if (newLeadsCount > 0) {
      await adminDb.collection("logs").add({
        type: "scraper_run",
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Background scan completed. Found ${newLeadsCount} new leads.`,
        createdAt: FieldValue.serverTimestamp(),
        userId: scraper.userId,
      });
    }
  } catch (error: any) {
    await logSystemError(
      "scraper_execution",
      `Scraper ${scraper.name} execution failed`,
      { error: error.message, stack: error.stack, scraperId: scraper.id },
    );
    const errorMessage = error instanceof Error ? error.message : String(error);
    const newConsecutiveErrors = (scraper.consecutiveErrors || 0) + 1;
    console.error(
      `[Background Engine] Error running scraper ${scraper.name} (failure #${newConsecutiveErrors}):`,
      errorMessage,
    );

    // Phase 2.0: Smart error handling with exponential backoff + auto-pause.
    try {
      const scraperRef = adminDb.collection("scrapers").doc(scraper.id);
      const updatePayload: any = {
        lastError: errorMessage.substring(0, 500),
        lastErrorAt: FieldValue.serverTimestamp(),
        consecutiveErrors: newConsecutiveErrors,
        // CRITICAL: Update lastRunAt on error too, so the backoff timer starts
        // from NOW, not from the last successful run. Without this, the scraper
        // would retry every 60 seconds regardless of backoff.
        lastRunAt: FieldValue.serverTimestamp(),
      };

      // Auto-pause after MAX_CONSECUTIVE_ERRORS failures to prevent infinite retries
      if (newConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        updatePayload.status = "paused";
        console.warn(
          `[Background Engine] ⚠ AUTO-PAUSED scraper "${scraper.name}" after ${newConsecutiveErrors} consecutive failures. Manual restart required.`,
        );
      } else {
        const nextBackoff = Math.min(
          MAX_BACKOFF_MINUTES,
          Math.pow(2, newConsecutiveErrors),
        );
        console.warn(
          `[Background Engine] Scraper "${scraper.name}" will retry with ${nextBackoff}min backoff (${MAX_CONSECUTIVE_ERRORS - newConsecutiveErrors} attempts remaining before auto-pause)`,
        );
      }

      await scraperRef.update(updatePayload);

      // Write a structured error log visible in the Activity Feed
      const logMessage =
        newConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS
          ? `Scraper AUTO-PAUSED after ${newConsecutiveErrors} consecutive failures: ${errorMessage.substring(0, 150)}`
          : `Scraper failed (attempt ${newConsecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${errorMessage.substring(0, 150)}`;

      await adminDb.collection("logs").add({
        type:
          newConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS
            ? "scraper_auto_paused"
            : "scraper_error",
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: logMessage,
        details: `Platform: ${scraper.platform || "reddit"} | Target: ${scraper.target || scraper.subreddit || "N/A"} | Next backoff: ${Math.min(MAX_BACKOFF_MINUTES, Math.pow(2, newConsecutiveErrors))}min`,
        createdAt: FieldValue.serverTimestamp(),
        userId: scraper.userId,
      });
    } catch (logErr) {
      console.error(
        `[Background Engine] Failed to log error for scraper ${scraper.id}:`,
        logErr,
      );
    }
  }
}

async function updateScraperLastRun(scraper: any, force: boolean = false) {
  try {
    // Update in-memory tracker first
    inMemoryLastRun.set(scraper.id, Date.now());

    // Optimization: Only update Firestore if leads were found OR if we explicitly want to persist the "silence"
    // Persistent silence is critical to keep the Date-Fence updated and avoid "Goldfish Memory" reads after a restart.
    if (!force) {
      return;
    }

    const scraperRef = adminDb.collection("scrapers").doc(scraper.id);
    await scraperRef.update({
      lastRunAt: FieldValue.serverTimestamp(),
      errorLastRun: null,
      consecutiveErrors: 0,
    });
  } catch (err) {
    console.error(
      `[Background Engine] Failed to update heartbeat for ${scraper.id}:`,
      err,
    );
  }
}

startServer();
