import express from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { createServer as createViteServer } from "vite";
import path from "path";
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getSecurityRules } from 'firebase-admin/security-rules';
import Parser from 'rss-parser';

/**
 * Phase 1.2: Generates a deterministic, collision-resistant document ID for
 * each lead based on a SHA-256 hash of its URL and scraperId.
 * This replaces the expensive 1000-lead lookback query for deduplication.
 * Using setDoc with the same ID is idempotent — duplicates are silently skipped.
 */
function generateLeadId(postUrl: string, scraperId: string): string {
  return createHash('sha256').update(`${scraperId}::${postUrl}`).digest('hex').substring(0, 40);
}

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Load config safely
const firebaseConfig = JSON.parse(
  readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8')
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
        console.log("[Firebase Admin] Using Service Account from environment variable");
      } catch (parseError) {
        console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:", parseError);
        credential = applicationDefault();
      }
    } else {
      credential = applicationDefault();
      console.log("[Firebase Admin] Using default application credentials");
    }

    initializeApp({
      credential
    });
  }
  console.log('Admin Project ID:', getApp().options.projectId);
} catch (e) {
  console.error("[Firebase Admin] Critical Init failed:", e);
}

const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
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
  console.log(`[Firebase Admin] Firestore instance created for database: ${databaseId || "(default)"}`);
  
    // Test connection immediately
    adminDb.collection('health_check').limit(1).get()
      .then(() => console.log("[Firebase Admin] Connection test successful"))
      .catch((err: any) => {
        console.error("[Firebase Admin] Connection test failed with error code:", err.code);
        console.error("[Firebase Admin] Connection test failed with message:", err.message);
        if (err.stack) console.error("[Firebase Admin] Stack trace:", err.stack);
      });

} catch (e) {
  console.error("[Firebase Admin] Firestore critical init failed:", e);
}

// Initialize AI
const apiKey = process.env.LEAD_SCORER_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[Warning] No Gemini API key found. Please set LEAD_SCORER_API_KEY in your environment variables.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });

async function logSystemError(type: string, message: string, details: any = {}, userId?: string) {
  console.error(`[Error][${type}] ${message}`, details);
  try {
    if (adminDb) {
      await adminDb.collection('logs').add({
        type: `system_error_${type}`,
        message,
        details: typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details),
        createdAt: FieldValue.serverTimestamp(),
        userId: userId || 'system',
        path: details.path || null
      });
    }
  } catch (e: any) {
    console.error("[Logging Failed] Could not write to logs collection:", e.message);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

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

  app.post("/api/admin/update-rules", async (req, res) => {
    try {
      const rules = readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
      const projectId = firebaseConfig.projectId;
      
      console.log(`[Rules Update] Deploying to Project: ${projectId}, Database: ${databaseId || '(default)'}`);
      
      // Use the security rules API to update rules for the named database
      const rulesClient = getSecurityRules(getApp()) as any;
      const ruleset = await rulesClient.createRuleset({
        files: [{ name: 'firestore.rules', content: rules }]
      });
      
      // Explicit database path for AI Studio instances
      const releaseName = databaseId 
        ? `projects/${projectId}/databases/${databaseId}/documents`
        : `projects/${projectId}/databases/(default)/documents`;
        
      console.log(`[Rules Update] Releasing ruleset: ${ruleset.name} to ${releaseName}`);
      
      try {
        await rulesClient.releaseRuleset(releaseName, ruleset.name);
      } catch (releaseError: any) {
        console.warn(`[Rules Update] Primary release failed, trying fallback: ${releaseError.message}`);
        await rulesClient.releaseRuleset(`cloud.firestore${databaseId ? `/${databaseId}` : ''}`, ruleset.name);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("admin_rules", "Failed to update rules", { error: error.message, stack: error.stack });
      res.status(500).json({ error: "Failed to update rules", details: error.message });
    }
  });

  app.post("/api/suggest-keywords", express.json(), async (req, res) => {
    try {
      const { clientName, idealCustomerProfile } = req.body;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const prompt = `You are a world-class marketing psychologist and lead generation expert.
      
      CLIENT: ${clientName || 'A business'}
      IDEAL CUSTOMER PROFILE: ${idealCustomerProfile || 'General commercial intent'}
      
      TASK: Based STRICTLY on the Ideal Customer Profile (IDP) provided above, suggest 15 high-intent "trigger phrases" or "active search keywords". 
      
      THINK: What EXACTLY would this specific persona type into a search bar if they were desperate for a solution? Avoid generic phrases. Prioritize specific pain points (e.g., "how to fix X", "alternative to Y that isn't Z", "recommendation for niche industry A").
      
      Return ONLY a valid JSON array of strings.
      Format: ["keyphrase1", "keyphrase2", ...]`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const responseText = aiResponse.text || '[]';
      const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const keywords = JSON.parse(cleanedText);

      res.json({ keywords });
    } catch (error: any) {
      console.error("[API] Keyword suggestion failed:", error);
      const status = error.status || 500;
      res.status(status).json({ 
        error: error.message || "Failed to suggest keywords",
        code: status === 429 ? 'QUOTA_EXCEEDED' : 'INTERNAL_ERROR'
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
      
      CLIENT: ${clientName || 'A business'}
      IDEAL CUSTOMER PROFILE: ${idealCustomerProfile || 'General commercial intent'}
      SELECTED PLATFORMS: ${platforms?.join(', ') || 'Reddit'}
      
      TASK: Based STRICTLY on the Ideal Customer Profile (IDP), identify specific communities (Targets) where this EXACT customer archetype discusses their problems.
      
      CRITICAL RELEVANCE: Look for niche "watering holes" rather than generic broad categories. 
      If the IDP mentions "B2B SaaS owners", don't just suggest "r/business", suggest "r/SaaS" or "r/entrepreneur".
      
      RESTRICTION: You MUST ONLY suggest targets for the platforms listed in "SELECTED PLATFORMS". 
      - If Reddit is selected: Suggest specific subreddits (e.g., "Entrepreneur", "reactjs").
      - If Stack Overflow is selected: Suggest specific technical tags (e.g., "javascript", "python").
      - If Craigslist is selected: Suggest specific high-intent search keywords (e.g., "needed: plumber", "hiring admin").
      - If Hacker News is selected: Suggest categories (e.g., "ask", "show").
      
      Return ONLY a valid JSON array of strings.
      Format: ["target1", "target2", ...]`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const responseText = aiResponse.text || '[]';
      const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const targets = JSON.parse(cleanedText);

      res.json({ targets });
    } catch (error: any) {
      console.error("[API] Target suggestion failed:", error);
      const status = error.status || 500;
      res.status(status).json({ 
        error: error.message || "Failed to suggest targets",
        code: status === 429 ? 'QUOTA_EXCEEDED' : 'INTERNAL_ERROR'
      });
    }
  });

  app.get("/api/reddit/:subreddit", async (req, res) => {
    try {
      const { subreddit } = req.params;
      
      if (!subreddit || subreddit.trim() === "") {
        return res.status(400).json({ error: "Subreddit name is required" });
      }

      // Use RSS feed via rss2json to bypass Reddit's strict IP blocking
      const rssUrl = encodeURIComponent(`https://www.reddit.com/r/${subreddit.trim()}/new.rss`);
      
      const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`RSS API Error (${response.status}):`, responseText);
        return res.status(response.status).json({ 
          error: `RSS Service Error: ${response.status}`,
          details: responseText 
        });
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse RSS API response as JSON:", responseText.substring(0, 500));
        return res.status(500).json({ error: "RSS Service returned invalid JSON", details: responseText.substring(0, 200) });
      }
      
      if (data.status !== 'ok') {
        console.error("RSS2JSON returned non-ok status:", data);
        return res.status(500).json({ 
          error: "Failed to parse RSS feed", 
          details: data.message || "Unknown RSS error" 
        });
      }
      
      const items = data.items || [];
      
      // Map the RSS output to match the exact frontend data structure
      const mappedPosts = items.map((item: any, index: number) => {
        let permalink = item.link || '';
        try {
          permalink = new URL(item.link).pathname;
        } catch (e) {
          permalink = permalink.replace('https://www.reddit.com', '');
        }
        
        const rawContent = item.content || item.description || '';
        
        return {
          data: {
            index,
            title: item.title || '',
            selftext: rawContent.replace(/<[^>]*>?/gm, ''),
            author: (item.author || '').replace('/u/', ''),
            permalink: permalink,
            pubDate: item.pubDate
          }
        };
      });
      
      // Only process posts from the last 48 hours to ensure they are "recent"
      const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
      const recentPosts = mappedPosts.filter((post: any) => {
        const postDate = new Date(post.data.pubDate).getTime();
        return postDate > fortyEightHoursAgo;
      });

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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const { token } = req.params;
    try {
      if (!token || token.length < 10) {
        return res.status(400).json({ error: "Invalid portal token" });
      }

      // Find ALL scrapers with this portalToken
      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        return res.status(404).json({ error: "Portal not found" });
      }

      const scrapersData = scrapersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      const scraperIds = scrapersData.map((s: any) => s.id);
      
      // Use the first scraper for general client info
      const primaryScraper = scrapersData[0];

      // Fetch leads for ALL matching scrapers (using in operator for efficiency)
      // Firestore 'in' query has a limit of 30, which should be plenty for scrapers per client.
      // If we exceed 30, we might need multiple queries.
      const leadsSnap = await adminDb.collection('leads')
        .where('scraperId', 'in', scraperIds)
        .where('pushedToPortal', '==', true)
        .get();

      const leads = leadsSnap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          postTitle: data.postTitle,
          postContent: data.postContent || '',
          postUrl: data.postUrl,
          postAuthor: data.postAuthor,
          score: data.score,
          reason: data.reason,
          platform: data.platform,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          clientViewCount: data.clientViewCount || 0,
          clientFeedback: data.clientFeedback || '',
          engagementOutcome: data.engagementOutcome || 'none',
        };
      });

      // Sort by createdAt desc
      leads.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Filter out leads that the client has deleted (but keep them in DB for admin)
      const activeLeads = leads.filter((l: any) => l.status !== 'deleted');

      // Aggregate counts
      const totalPushed = scrapersData.reduce((acc: number, s: any) => acc + (s.totalPushedLeads || 0), 0);
      const avgTrialLimit = primaryScraper.trialLimit || 10;
      const isPaid = scrapersData.some((s: any) => s.isPaid === true);

      res.json({
        clientName: primaryScraper.clientName || 'Client',
        scraperName: scrapersData.map((s: any) => s.name).join(', '),
        totalLeads: activeLeads.length,
        trialLimit: avgTrialLimit,
        isPaid: isPaid,
        isAiEnabled: scrapersData.some((s: any) => s.isAiEnabled === true),
        leads: activeLeads,
        setupCompleted: scrapersData.some((s: any) => s.portalSetupCompleted === true),
        scrapers: scrapersData.map((s: any) => ({
          id: s.id,
          name: s.name,
          clientName: s.clientName,
          portalSetupCompleted: s.portalSetupCompleted
        }))
      });
    } catch (error: any) {
      await logSystemError("portal_fetch", "Failed to fetch portal", { error: error.message, stack: error.stack, token: token });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/generate-comment/:leadId - On-demand AI comment generation
  app.post("/api/portal/:token/generate-comment/:leadId", express.json(), async (req, res) => {
    const { token, leadId } = req.params;
    try {

      // 1. Verify Portal Token
      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        return res.status(403).json({ error: "Unauthorized portal access" });
      }

      // 2. Fetch Lead
      const leadSnap = await adminDb.collection('leads').doc(leadId).get();
      if (!leadSnap.exists) {
        return res.status(404).json({ error: "Match not found" });
      }
      const leadData = leadSnap.data();

      // 3. Find the specific monitor for this lead
      const scraper = scrapersSnap.docs.find(d => d.id === leadData.scraperId)?.data();
      if (!scraper) {
        return res.status(403).json({ error: "Monitor not found for this match" });
      }

      // 4. Check if AI is enabled by the provider
      if (!scraper.isAiEnabled) {
        return res.status(403).json({ error: "AI Power-ups are disabled for this portal. Please contact your provider." });
      }

      // 5. Build the Generation Prompt
      const prompt = `You are ${scraper.clientName || 'the user'}, a ${scraper.isSoloFreelancer ? 'Solo Freelancer' : 'Company/Agency'} specialized in ${scraper.clientSells || 'providing high-value solutions'}.
      Your core value proposition: ${scraper.clientDoes || 'We deliver excellent results.'}
      Your preferred communication tone: ${scraper.clientTone || 'Friendly'}

      SOCIAL MEDIA POST TO INTERACT WITH:
      Title: ${leadData.postTitle}
      Content: ${leadData.postContent || 'N/A'}

      TASK: Draft a highly context-aware, helpful, and insightful "Smart Comment" for this post.
      - Deeply analyze any frustrations, questions, or software pain points the author is expressing.
      - If they have a question, offer a helpful tip or directly answer it drawing from your expertise.
      - If they express a pain point (e.g. software issues, workflow bottlenecks), acknowledge it empathetically.
      - DO NOT pitch or sell aggressively. This is relationship and community building.
      - SUBTLE NUDGING: You must implicitly and elegantly hint that you are a better alternative or have solved this problem. Use framing such as "At ${scraper.clientName || 'our company'}, we deliberately built our process to avoid exactly this..." or "We've noticed this is a common issue with X, which is why we approach it differently..." ONLY when it genuinely fits the context.
      - Maintain a ${scraper.clientTone} tone. Keep it short: 2-3 sentences max.

      Return ONLY the comment text. No preamble.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const comment = aiResponse.text || "I'm sorry, I couldn't generate a comment at this time.";

      res.json({ comment: comment.trim() });

    } catch (error: any) {
      await logSystemError("portal_ai_comment", "Comment generation failed", { error: error.message, stack: error.stack, token, leadId });
      res.status(500).json({ error: "Failed to generate AI comment" });
    }
  });

  // POST /api/portal/:token/setup - Client completes portal setup
  app.post("/api/portal/:token/setup", express.json(), async (req, res) => {
    const { token } = req.params;
    try {
      const { 
        isSoloFreelancer,
        clientBusiness,
        clientSells,
        clientDoes,
        clientTone 
      } = req.body;

      // 1. Verify Portal Token and get scrapers
      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        return res.status(404).json({ error: "Portal not found" });
      }

      // 2. Batch update all scrapers for this client
      const batch = adminDb.batch();
      scrapersSnap.docs.forEach((doc: any) => {
        batch.update(doc.ref, {
          isSoloFreelancer,
          clientBusiness,
          clientSells,
          clientDoes,
          clientTone,
          portalSetupCompleted: true
        });
      });

      await batch.commit();

      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_setup", "Setup failed", { error: error.message, stack: error.stack, token });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/delete/:leadId - Client deletes a lead
  app.post("/api/portal/:token/delete/:leadId", async (req, res) => {
    const { token, leadId } = req.params;
    try {

      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .limit(1)
        .get();

      if (scrapersSnap.empty) {
        return res.status(404).json({ error: "Portal not found" });
      }

      await adminDb.collection('leads').doc(leadId).update({
        status: 'deleted',
        clientDeletedAt: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_delete_lead", "Error deleting lead", { error: error.message, stack: error.stack, token, leadId });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/click/:leadId - Track lead click
  app.post("/api/portal/:token/click/:leadId", async (req, res) => {
    const { token, leadId } = req.params;
    try {

      // Verify token maps to a valid scraper
      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        return res.status(404).json({ error: "Portal not found" });
      }

      const scraperIds = scrapersSnap.docs.map(d => d.id);

      // Verify lead belongs to this scraper
      const leadRef = adminDb.collection('leads').doc(leadId);
      const leadSnap = await leadRef.get();
      if (!leadSnap.exists || !scraperIds.includes(leadSnap.data()?.scraperId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Increment per-lead click count
      await leadRef.update({
        clientViewCount: (leadSnap.data().clientViewCount || 0) + 1
      });

      // Increment aggregate scraper click count for the specific scraper this lead belongs to
      const actualScraperId = leadSnap.data().scraperId;
      const actualScraperRef = adminDb.collection('scrapers').doc(actualScraperId);
      const actualScraperSnap = await actualScraperRef.get();
      
      if (actualScraperSnap.exists) {
        await actualScraperRef.update({
          totalClientClicks: (actualScraperSnap.data().totalClientClicks || 0) + 1
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_click_tracking", "Click tracking error", { error: error.message, stack: error.stack, token, leadId });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/feedback/:leadId - Submit feedback
  app.post("/api/portal/:token/feedback/:leadId", express.json(), async (req, res) => {
    const { token, leadId } = req.params;
    try {
      const { feedback } = req.body;

      if (!feedback || typeof feedback !== 'string' || feedback.length > 500) {
        return res.status(400).json({ error: "Invalid feedback" });
      }

      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        return res.status(404).json({ error: "Portal not found" });
      }

      const scraperIds = scrapersSnap.docs.map((d: any) => d.id);

      const leadRef = adminDb.collection('leads').doc(leadId);
      const leadSnap = await leadRef.get();
      if (!leadSnap.exists || !scraperIds.includes(leadSnap.data().scraperId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await leadRef.update({ clientFeedback: feedback });
      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_feedback", "Feedback error", { error: error.message, stack: error.stack, token, leadId });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/portal/:token/outcome/:leadId - Submit engagement outcome
  app.post("/api/portal/:token/outcome/:leadId", express.json(), async (req, res) => {
    const { token, leadId } = req.params;
    try {
      const { outcome } = req.body;

      if (!outcome || typeof outcome !== 'string') {
        return res.status(400).json({ error: "Invalid outcome" });
      }

      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        return res.status(404).json({ error: "Portal not found" });
      }

      const scraperIds = scrapersSnap.docs.map((d: any) => d.id);

      const leadRef = adminDb.collection('leads').doc(leadId);
      const leadSnap = await leadRef.get();
      if (!leadSnap.exists || !scraperIds.includes(leadSnap.data().scraperId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await leadRef.update({ engagementOutcome: outcome });
      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_outcome", "Outcome tracking error", { error: error.message, stack: error.stack, token, leadId });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/portal/:token/chat/stream - SSE Chat Stream
  app.get("/api/portal/:token/chat/stream", async (req, res) => {
    const { token } = req.params;
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    try {
      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        res.write('event: error\ndata: {"error":"Portal not found"}\n\n');
        return res.end();
      }

      const unsubscribe = adminDb.collection('portal_chats').doc(token).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(
          (snapshot) => {
            const messages = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                text: data.text,
                sender: data.sender,
                isRead: data.isRead,
                timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
              };
            });
            res.write(`data: ${JSON.stringify(messages)}\n\n`);
          },
          (error) => {
            console.error('SSE Snapshot error:', error);
            res.write(`event: error\ndata: {"error":"${error.message}"}\n\n`);
          }
        );

      req.on('close', () => {
        unsubscribe();
      });

    } catch (error: any) {
      console.error('SSE Auth error:', error);
      res.write('event: error\ndata: {"error":"Internal server error"}\n\n');
      res.end();
    }
  });

  // POST /api/portal/:token/chat - Send Chat Message
  app.post("/api/portal/:token/chat", express.json(), async (req, res) => {
    const { token } = req.params;
    try {
      const { text, sender } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Invalid message text" });
      }
      
      const safeSender = sender === 'admin' ? 'admin' : 'client';

      const scrapersSnap = await adminDb.collection('scrapers')
        .where('portalToken', '==', token)
        .get();

      if (scrapersSnap.empty) {
        return res.status(404).json({ error: "Portal not found" });
      }
      
      const clientName = scrapersSnap.docs[0].data().clientName || 'Client';
      const userId = scrapersSnap.docs[0].data().userId;

      await adminDb.collection('portal_chats').doc(token).collection('messages').add({
        text,
        sender: safeSender,
        isRead: false,
        timestamp: FieldValue.serverTimestamp()
      });
      
      await adminDb.collection('portal_chats').doc(token).set({
        lastMessage: text.substring(0, 50),
        lastMessageAt: FieldValue.serverTimestamp(),
        lastSender: safeSender,
        clientName: clientName,
        userId: userId,
        hasUnreadAdmin: safeSender === 'client',
        hasUnreadClient: safeSender === 'admin',
      }, { merge: true });

      if (safeSender === 'client') {
        await adminDb.collection('logs').add({
          type: 'chat_message',
          message: `New message from ${clientName}: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`,
          userId: userId,
          createdAt: FieldValue.serverTimestamp(),
          token: token
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      await logSystemError("portal_chat", "Chat send error", { error: error.message, stack: error.stack, token });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on port ${PORT}`);
    
    // Deploy rules to named database on startup
    const deployRules = async () => {
      try {
        const response = await fetch(`http://localhost:${PORT}/api/admin/update-rules`, { method: 'POST' });
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.error) {
            console.error("[Firebase Admin] Rules deployment ERROR:", data.error, data.details || "");
          } else {
            console.log("[Firebase Admin] Rules deployment:", data);
          }
        } else {
          const text = await response.text();
          console.warn("[Firebase Admin] Rules deployment returned non-JSON response:", text.substring(0, 100));
        }
      } catch (err) {
        console.error("[Firebase Admin] Rules deployment request failed:", err);
      }
    };
    
    deployRules();
    
    // Start background scraper engine
    console.log("Starting background scraper engine...");
    setInterval(runBackgroundScrapers, 60 * 1000); // Check every minute
    setTimeout(runBackgroundScrapers, 10000); // Run once after 10 seconds to allow server to fully start
  });
}

// Background Scraper Logic
// Phase 2.0: Smart error handling with exponential backoff.
// - After each consecutive failure, the scraper waits 2^N minutes (capped at 60 min)
//   before retrying, preventing rapid-fire failures from hammering external APIs.
// - After 5 consecutive failures, the scraper auto-pauses and logs a warning.
// - On a successful run, consecutiveErrors resets to 0.
const MAX_CONSECUTIVE_ERRORS = 5;
const MAX_BACKOFF_MINUTES = 60;

async function runBackgroundScrapers() {
  try {
    console.log(`[Background Engine] Checking for scrapers to run... ${new Date().toISOString()}`);
    const scrapersRef = adminDb.collection('scrapers');
    const querySnapshot = await scrapersRef.where('status', '==', 'active').get();
    
    for (const scraperDoc of querySnapshot.docs) {
      const scraper = { id: scraperDoc.id, ...scraperDoc.data() } as any;
      const lastRun = scraper.lastRunAt?.toMillis?.() || scraper.createdAt?.toMillis?.() || 0;
      
      // Phase 2.0: Apply exponential backoff if the scraper has consecutive errors.
      // Normal interval + backoff penalty = effective cooldown between retries.
      const consecutiveErrors = scraper.consecutiveErrors || 0;
      const backoffMinutes = consecutiveErrors > 0 
        ? Math.min(MAX_BACKOFF_MINUTES, Math.pow(2, consecutiveErrors))
        : 0;
      const effectiveInterval = (scraper.intervalMinutes + backoffMinutes) * 60 * 1000;
      const nextRun = lastRun + effectiveInterval;
      
      if (Date.now() >= nextRun) {
        if (consecutiveErrors > 0) {
          console.log(`[Background Engine] Retrying scraper: ${scraper.name} (attempt after ${consecutiveErrors} failures, backoff: ${backoffMinutes}min)`);
        } else {
          console.log(`[Background Engine] Running scraper: ${scraper.name} (${scraper.platform || 'reddit'}/${scraper.target || scraper.subreddit})`);
        }
        try {
          await executeScraper(scraper);
          // Add a 5-second delay between scrapers to avoid rate limits across different platforms
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (err) {
          console.error(`[Background Engine] Error executing scraper ${scraper.id}:`, err);
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
    
    if (data.status !== 'ok') {
      throw new Error(data.message || "Unknown RSS error");
    }
    
    const items = data.items || [];
    
    const mappedPosts = items.map((item: any, index: number) => {
      let permalink = item.link || '';
      try {
        permalink = new URL(item.link).pathname;
      } catch (e) {
        permalink = permalink.replace('https://www.reddit.com', '');
      }
      
      const rawContent = item.content || item.description || '';
      
      return {
        data: {
          index,
          title: item.title || '',
          selftext: rawContent.replace(/<[^>]*>?/gm, ''), // strip HTML tags
          author: (item.author || '').replace('/u/', ''),
          permalink: permalink,
          pubDate: item.pubDate
        }
      };
    });
    
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const recentPosts = mappedPosts.filter((post: any) => {
      const postDate = new Date(post.data.pubDate).getTime();
      return postDate > fortyEightHoursAgo;
    });
  
    return recentPosts.slice(0, limit);
  } catch (error) {
    console.error(`[Reddit RSS Fetch] Failed:`, error);
    throw new Error(`Failed to fetch Reddit posts: ${error instanceof Error ? error.message : String(error)}`);
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
    
    if (data.status !== 'ok') {
      throw new Error(data.message || "Unknown RSS error");
    }
    
    const items = data.items || [];
    const mappedPosts = items.map((item: any, index: number) => {
      let permalink = item.link || '';
      try { 
        const url = new URL(item.link);
        permalink = url.pathname + url.search; 
      } catch (e) { 
        permalink = permalink.replace('https://stackoverflow.com', ''); 
      }
      const rawContent = item.content || item.description || '';
      return {
        data: {
          index,
          title: item.title || '',
          selftext: rawContent.replace(/<[^>]*>?/gm, ''),
          author: item.author || 'unknown',
          permalink: permalink,
          pubDate: item.pubDate
        }
      };
    });
    
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const recentPosts = mappedPosts.filter((post: any) => new Date(post.data.pubDate).getTime() > fortyEightHoursAgo);
    return recentPosts.slice(0, limit);
  } catch (error) {
    console.error(`[Stack Overflow Fetch] Primary failed, trying direct:`, error);
    try {
      const response = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/atom+xml, application/xml, text/xml'
        }
      });
      if (response.ok) {
        const xml = await response.text();
        const feed = await parser.parseString(xml);
        const items = feed.items || [];
        return items.map((item: any, index: number) => ({
          data: {
            index,
            title: item.title || '',
            selftext: (item.content || item.description || '').replace(/<[^>]*>?/gm, ''),
            author: item.author || 'unknown',
            permalink: item.link?.replace('https://stackoverflow.com', '') || '',
            pubDate: item.pubDate || item.isoDate
          }
        })).slice(0, limit);
      }
    } catch (directError) {
      console.error(`[Stack Overflow Fetch] Direct also failed:`, directError);
    }
    throw new Error(`Failed to fetch Stack Overflow RSS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to fetch Hacker News posts
async function fetchHackerNewsPosts(category: string = 'newest', limit: number = 25) {
  // Map categories to hnrss.org endpoints
  const categoryMap: Record<string, string> = {
    'newest': 'newest',
    'frontpage': 'frontpage',
    'ask': 'ask',
    'show': 'show',
    'jobs': 'jobs'
  };
  
  const endpoint = categoryMap[category] || 'newest';
  const rssUrl = `https://hnrss.org/${endpoint}`;
  
  try {
    const feed = await parser.parseURL(rssUrl);
    const items = feed.items || [];
    const mappedPosts = items.map((item: any, index: number) => {
      let permalink = item.link || '';
      try { permalink = new URL(item.link).pathname + new URL(item.link).search; } catch (e) { permalink = permalink.replace('https://news.ycombinator.com', ''); }
      const rawContent = item.content || item.description || '';
      
      // hnrss.org usually puts the author in the 'creator' or 'author' field
      // or sometimes it's in the description like "by user"
      let author = item.creator || item.author || 'unknown';
      if (author === 'unknown' && item.contentSnippet) {
        const match = item.contentSnippet.match(/by\s+([^\s|]+)/i);
        if (match) author = match[1];
      }

      return {
        data: {
          index,
          title: item.title || '',
          selftext: rawContent.replace(/<[^>]*>?/gm, ''),
          author: author,
          permalink: permalink,
          pubDate: item.pubDate || item.isoDate
        }
      };
    });
    
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const recentPosts = mappedPosts.filter((post: any) => new Date(post.data.pubDate).getTime() > fortyEightHoursAgo);
    return recentPosts.slice(0, limit);
  } catch (error) {
    console.error(`[RSS Parser] Hacker News failed:`, error);
    throw new Error(`Failed to fetch Hacker News RSS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to fetch Craigslist posts
async function fetchCraigslistPosts(city: string, category: string, query: string, limit: number = 25) {
  const rssUrl = `https://${city.trim()}.craigslist.org/search/${category.trim()}?format=rss&query=${encodeURIComponent(query)}`;
  const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  
  try {
    console.log(`[Craigslist RSS Fetch] Fetching via rss2json for ${city}/${category}`);
    const response = await fetch(rss2jsonUrl);
    
    if (!response.ok) {
      throw new Error(`RSS Service Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(data.message || "Unknown RSS error");
    }
    
    const items = data.items || [];
    const mappedPosts = items.map((item: any, index: number) => {
      return {
        data: {
          index,
          title: item.title || '',
          selftext: (item.content || item.description || '').replace(/<[^>]*>?/gm, ''),
          author: item.author || 'craigslist-user',
          permalink: item.link || '', 
          pubDate: item.pubDate
        }
      };
    });
    
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const recentPosts = mappedPosts.filter((post: any) => new Date(post.data.pubDate).getTime() > fortyEightHoursAgo);
    return recentPosts.slice(0, limit);
  } catch (error) {
    console.error(`[Craigslist RSS Fetch] Primary failed, trying direct:`, error);
    try {
      const feed = await parser.parseURL(rssUrl);
      const items = feed.items || [];
      return items.map((item: any, index: number) => ({
        data: {
          index,
          title: item.title || '',
          selftext: (item.content || item.description || '').replace(/<[^>]*>?/gm, ''),
          author: item.author || 'craigslist-user',
          permalink: item.link || '', 
          pubDate: item.pubDate || item.isoDate
        }
      })).slice(0, limit);
    } catch (directError) {
      console.error(`[Craigslist RSS Fetch] Direct also failed:`, directError);
    }
    throw new Error(`Failed to fetch Craigslist RSS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function executeScraper(scraper: any) {
  try {
    let rawPosts = [];
    if (scraper.platform === 'stackoverflow') {
      rawPosts = await fetchStackOverflowPosts(scraper.target || scraper.subreddit, 50);
    } else if (scraper.platform === 'hackernews') {
      rawPosts = await fetchHackerNewsPosts(scraper.category || 'newest', 50);
    } else if (scraper.platform === 'craigslist') {
      rawPosts = await fetchCraigslistPosts(scraper.city, scraper.category, scraper.keyword, 50);
    } else {
      // Add a small random delay before Reddit fetch to avoid being flagged as a bot
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      rawPosts = await fetchRedditPosts(scraper.target || scraper.subreddit, 50);
    }
    
    if (!rawPosts || rawPosts.length === 0) return;

    const keywords = (scraper.keyword || '').toLowerCase().split(',').map((k: string) => k.trim()).filter((k: string) => k !== '');

    // Phase 1.2: Build the full postUrl for each raw post, then generate deterministic
    // document IDs. We check Firestore with a single .getAll() batched read instead
    // of a 1000-lead query scan, making deduplication O(N posts) not O(existing leads).
    const rawPostsWithUrls = rawPosts.map((post: any) => {
      let postUrl = '';
      if (scraper.platform === 'stackoverflow') {
        postUrl = `https://stackoverflow.com${post.data.permalink}`;
      } else if (scraper.platform === 'hackernews') {
        postUrl = `https://news.ycombinator.com${post.data.permalink}`;
      } else if (scraper.platform === 'craigslist') {
        postUrl = post.data.permalink;
      } else {
        postUrl = `https://www.reddit.com${post.data.permalink}`;
      }
      const leadId = generateLeadId(postUrl, scraper.id);
      return { ...post, postUrl, leadId };
    });

    // Batch-check existence: getAll() returns stubs for missing docs (cheap read)
    const leadsRef = adminDb.collection('leads');
    const docRefs = rawPostsWithUrls.map((p: any) => leadsRef.doc(p.leadId));
    const existingDocs = docRefs.length > 0 ? await adminDb.getAll(...docRefs) : [];
    const existingIds = new Set(existingDocs.filter((d: any) => d.exists).map((d: any) => d.id));

    // Only posts whose hash-ID does not yet exist in Firestore are truly new
    const newPosts = rawPostsWithUrls.filter((post: any) => !existingIds.has(post.leadId));

    if (newPosts.length === 0) {
      console.log(`[Background Engine] No new posts found for ${scraper.name}`);
      await updateScraperLastRun(scraper);
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
        author: post.data.author || 'the author',
        content: post.data.selftext.substring(0, 500) // Limit content length per post
      }));

      const prompt = `You are an expert lead generation analyst. I am providing a JSON array of ${minimizedData.length} recent social media posts. 
      
      YOUR CLIENT: ${scraper.clientName || scraper.name}
      YOUR CLIENT'S BUSINESS PROFILE:
      - ${scraper.isSoloFreelancer ? 'Type: Solo Freelancer' : 'Type: Company/Agency'}
      - Business Name/Identity: ${scraper.clientBusiness || scraper.clientName || 'The Client'}
      - What they sell: ${scraper.clientSells || 'Professional services'}
      - What they do/Value prop: ${scraper.clientDoes || 'High-quality solutions'}
      - Preferred outreach tone: ${scraper.clientTone || 'Friendly'}

      YOUR SPECIFIC TARGET (Ideal Customer Profile): ${scraper.idealCustomerProfile || scraper.leadDefinition || 'General commercial intent'}
      
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
        "isLead": boolean, 
        "enrichment": {
          "email": "string or null",
          "phone": "string or null",
          "location": "string or null",
          "company": "string or null"
        }
      }]
      
      Input Data:
      ${JSON.stringify(minimizedData)}`;

      let scoredBatch = [];
      try {
        if (!apiKey) throw new Error("No Gemini API key configured");
        
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        const responseText = aiResponse.text || '[]';
        const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        scoredBatch = JSON.parse(cleanedText);
      } catch (aiError: any) {
        if (aiError.status === 429) {
          console.error(`[Background Engine] [QUOTA EXCEEDED] AI Scoring failed for ${scraper.name}. Please check AI Studio spend cap.`);
        } else {
          console.error(`[Background Engine] AI Scoring failed for batch in ${scraper.name}:`, aiError.message || aiError);
        }
        
        // Fallback: just use keyword matching if AI fails
        scoredBatch = minimizedData.map((post: any) => ({
          index: post.index,
          score: 5,
          reason: aiError.status === 429 ? "AI Quota Exceeded, fallback to keyword match" : "AI scoring failed, fallback to keyword match",
          isLead: false,
          whatsappMessage: ""
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

      const title = post.data.title || '';
      const selftext = post.data.selftext || '';
      const titleLower = title.toLowerCase();
      const selftextLower = selftext.toLowerCase();
      
      const hasKeyword = keywords.length === 0 || keywords.some((kw: string) => 
        titleLower.includes(kw) || selftextLower.includes(kw)
      );
      
      const isAiLead = scoreObj.isLead === true || scoreObj.score >= 7;

      if (hasKeyword || isAiLead) {
        // Phase 1.2: Use the pre-computed hash ID for the document — guarantees
        // idempotency; a second write of the same post is a no-op.
        const postUrl = post.postUrl;
        const leadDocRef = adminDb.collection('leads').doc(post.leadId);

        // Client Alert Template for WhatsApp
        const matchRationale = scoreObj.matchRationale || scoreObj.reason || 'General match detected.';
        const whatsappTemplate = `*New Strategic Match Opportunity!* 🎯\n\n*Topic:* ${title.substring(0, 100)}${title.length > 100 ? '...' : ''}\n\n*Rationale:* ${matchRationale}\n\n*Action:* Review and interact with this match in your Growth Portal:\n[PORTAL_URL]`;
        
        const portalUrl = process.env.VITE_APP_URL ? `${process.env.VITE_APP_URL}/portal/${scraper.portalToken}` : `https://intent-first-hunter.web.app/portal/${scraper.portalToken}`;
        const finalWhatsappMessage = whatsappTemplate.replace(/\[PORTAL_URL\]/gi, portalUrl);
        
        // Use set() with the deterministic ID — duplicates are overwritten harmlessly
        batchWrite.set(leadDocRef, {
          scraperId: scraper.id,
          platform: scraper.platform || 'reddit',
          target: scraper.target || scraper.subreddit || '',
          city: scraper.city || '',
          category: scraper.category || '',
          subreddit: scraper.subreddit || '', // Keep for backward compatibility
          keyword: scraper.keyword,
          postTitle: title.substring(0, 500),
          postUrl: postUrl.substring(0, 500),
          postAuthor: (post.data.author || 'unknown').substring(0, 100),
          postContent: selftext.substring(0, 10000),
          score: Math.max(1, Math.min(10, scoreObj.score || 5)), // Ensure score is 1-10
          reason: (scoreObj.reason || '').substring(0, 2000),
          status: 'new',
          whatsappMessage: finalWhatsappMessage.substring(0, 5000),
          email: scoreObj.enrichment?.email || null,
          phone: scoreObj.enrichment?.phone || null,
          location: scoreObj.enrichment?.location || null,
          company: scoreObj.enrichment?.company || null,
          createdAt: FieldValue.serverTimestamp(),
          pubDate: post.data.pubDate || null,
          userId: scraper.userId,
          // Snapshot context at time of generation
          clientBusiness: scraper.clientBusiness || null,
          isSoloFreelancer: scraper.isSoloFreelancer || false
        }, { merge: true });
        newLeadsCount++;
        batchOperations++;

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

    await updateScraperLastRun(scraper);

    // Phase 2.0: Clear consecutive errors on success — the scraper is healthy again.
    if ((scraper.consecutiveErrors || 0) > 0) {
      await adminDb.collection('scrapers').doc(scraper.id).update({
        consecutiveErrors: 0,
        lastError: null,
        lastErrorAt: null
      });
      console.log(`[Background Engine] ✓ Scraper ${scraper.name} recovered after ${scraper.consecutiveErrors} failures. Error state cleared.`);
    }

    // Log completion
    if (newLeadsCount > 0) {
      await adminDb.collection('logs').add({
        type: 'scraper_run',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Background scan completed. Found ${newLeadsCount} new leads.`,
        createdAt: FieldValue.serverTimestamp(),
        userId: scraper.userId
      });
    }

  } catch (error: any) {
    await logSystemError("scraper_execution", `Scraper ${scraper.name} execution failed`, { error: error.message, stack: error.stack, scraperId: scraper.id });
    const errorMessage = error instanceof Error ? error.message : String(error);
    const newConsecutiveErrors = (scraper.consecutiveErrors || 0) + 1;
    console.error(`[Background Engine] Error running scraper ${scraper.name} (failure #${newConsecutiveErrors}):`, errorMessage);

    // Phase 2.0: Smart error handling with exponential backoff + auto-pause.
    try {
      const scraperRef = adminDb.collection('scrapers').doc(scraper.id);
      const updatePayload: any = {
        lastError: errorMessage.substring(0, 500),
        lastErrorAt: FieldValue.serverTimestamp(),
        consecutiveErrors: newConsecutiveErrors,
        // CRITICAL: Update lastRunAt on error too, so the backoff timer starts
        // from NOW, not from the last successful run. Without this, the scraper
        // would retry every 60 seconds regardless of backoff.
        lastRunAt: FieldValue.serverTimestamp()
      };

      // Auto-pause after MAX_CONSECUTIVE_ERRORS failures to prevent infinite retries
      if (newConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        updatePayload.status = 'paused';
        console.warn(`[Background Engine] ⚠ AUTO-PAUSED scraper "${scraper.name}" after ${newConsecutiveErrors} consecutive failures. Manual restart required.`);
      } else {
        const nextBackoff = Math.min(MAX_BACKOFF_MINUTES, Math.pow(2, newConsecutiveErrors));
        console.warn(`[Background Engine] Scraper "${scraper.name}" will retry with ${nextBackoff}min backoff (${MAX_CONSECUTIVE_ERRORS - newConsecutiveErrors} attempts remaining before auto-pause)`);
      }

      await scraperRef.update(updatePayload);

      // Write a structured error log visible in the Activity Feed
      const logMessage = newConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS
        ? `Scraper AUTO-PAUSED after ${newConsecutiveErrors} consecutive failures: ${errorMessage.substring(0, 150)}`
        : `Scraper failed (attempt ${newConsecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${errorMessage.substring(0, 150)}`;

      await adminDb.collection('logs').add({
        type: newConsecutiveErrors >= MAX_CONSECUTIVE_ERRORS ? 'scraper_auto_paused' : 'scraper_error',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: logMessage,
        details: `Platform: ${scraper.platform || 'reddit'} | Target: ${scraper.target || scraper.subreddit || 'N/A'} | Next backoff: ${Math.min(MAX_BACKOFF_MINUTES, Math.pow(2, newConsecutiveErrors))}min`,
        createdAt: FieldValue.serverTimestamp(),
        userId: scraper.userId
      });
    } catch (logErr) {
      console.error(`[Background Engine] Failed to log error for scraper ${scraper.id}:`, logErr);
    }
  }
}

async function updateScraperLastRun(scraper: any) {
  const scraperRef = adminDb.collection('scrapers').doc(scraper.id);
  const scraperSnap = await scraperRef.get();
  if (!scraperSnap.exists) {
    console.warn(`Scraper ${scraper.id} not found in DB, skipping update.`);
    return;
  }
  await scraperRef.update({
    lastRunAt: FieldValue.serverTimestamp()
  });
}

startServer();
