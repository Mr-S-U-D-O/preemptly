import express from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { createServer as createViteServer } from "vite";
import path from "path";
import { readFileSync } from 'fs';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getSecurityRules } from 'firebase-admin/security-rules';

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

// Add this route to update rules
const app = express();
app.post("/api/admin/update-rules", async (req, res) => {
  try {
    const rules = readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
    const projectId = firebaseConfig.projectId;
    
    // Use the security rules API to update rules for the named database
    const rulesClient = getSecurityRules(getApp()) as any;
    const ruleset = await rulesClient.createRuleset({
      files: [{ name: 'firestore.rules', content: rules }]
    });
    await rulesClient.releaseRuleset(`cloud.firestore${databaseId ? `/${databaseId}` : ''}`, ruleset.name);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating rules:", error);
    res.status(500).json({ error: "Failed to update rules" });
  }
});

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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

  app.post("/api/scrapers/:id/run", async (req, res) => {
    try {
      const { id } = req.params;
      const scraperDoc = await adminDb.collection('scrapers').doc(id).get();
      
      if (!scraperDoc.exists) {
        return res.status(404).json({ error: "Scraper not found" });
      }
      
      const scraper = { id: scraperDoc.id, ...scraperDoc.data() };
      
      // Execute scraper
      await executeScraper(scraper);
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error running scraper via API:", error);
      res.status(500).json({ error: "Failed to run scraper" });
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
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Deploy rules to named database on startup
    fetch(`http://localhost:${PORT}/api/admin/update-rules`, { method: 'POST' })
      .then(res => res.json())
      .then(data => console.log("[Firebase Admin] Rules deployment:", data))
      .catch(err => console.error("[Firebase Admin] Rules deployment failed:", err));
    
    // Start background scraper engine
    console.log("Starting background scraper engine...");
    setInterval(runBackgroundScrapers, 60 * 1000); // Check every minute
    setTimeout(runBackgroundScrapers, 10000); // Run once after 10 seconds to allow server to fully start
  });
}

// Background Scraper Logic
async function runBackgroundScrapers() {
  try {
    console.log(`[Background Engine] Checking for scrapers to run... ${new Date().toISOString()}`);
    const scrapersRef = adminDb.collection('scrapers');
    const querySnapshot = await scrapersRef.where('status', '==', 'active').get();
    
    for (const scraperDoc of querySnapshot.docs) {
      const scraper = { id: scraperDoc.id, ...scraperDoc.data() } as any;
      const lastRun = scraper.lastRunAt?.toMillis?.() || scraper.createdAt?.toMillis?.() || 0;
      const nextRun = lastRun + (scraper.intervalMinutes * 60 * 1000);
      
      if (Date.now() >= nextRun) {
        console.log(`[Background Engine] Running scraper: ${scraper.name} (r/${scraper.subreddit})`);
        try {
          await executeScraper(scraper);
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
  // Use RSS feed via rss2json to bypass Reddit's strict IP blocking
  const rssUrl = encodeURIComponent(`https://www.reddit.com/r/${subreddit.trim()}/new.rss`);
  
  const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
  
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`RSS API failed: ${response.status} - ${text.substring(0, 500)}`);
  }
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`RSS API returned invalid JSON (Status: ${response.status}): ${text.substring(0, 200)}...`);
  }
  
  if (data.status !== 'ok') {
    throw new Error(`RSS2JSON returned non-ok status: ${data.message || "Unknown RSS error"}`);
  }

  const items = data.items || [];
  
  // Map the RSS output to match the expected data structure
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
  
  // Only process posts from the last 48 hours to ensure they are "recent"
  const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
  const recentPosts = mappedPosts.filter((post: any) => {
    const postDate = new Date(post.data.pubDate).getTime();
    return postDate > fortyEightHoursAgo;
  });

  // Limit to the requested number
  return recentPosts.slice(0, limit);
}

async function executeScraper(scraper: any) {
  try {
    const rawPosts = await fetchRedditPosts(scraper.subreddit, 50); // Fetch up to 50 posts
    
    if (!rawPosts || rawPosts.length === 0) return;

    const keywordLower = scraper.keyword.toLowerCase();
    
    // Pre-fetch existing leads for this scraper to avoid N+1 queries
    const leadsRef = adminDb.collection('leads');
    const existingLeadsSnapshot = await leadsRef
      .where('scraperId', '==', scraper.id)
      .orderBy('createdAt', 'desc')
      .limit(100) // Look at the last 100 leads to check for duplicates
      .get();
    
    const existingUrls = new Set(existingLeadsSnapshot.docs.map((doc: any) => doc.data().postUrl));

    // Filter out posts we already have
    const newPosts = rawPosts.filter((post: any) => {
      const postUrl = `https://www.reddit.com${post.data.permalink}`;
      return !existingUrls.has(postUrl);
    });

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
        content: post.data.selftext.substring(0, 500) // Limit content length per post
      }));

      const prompt = `You are an expert lead generation analyst. I am providing a JSON array of ${minimizedData.length} recent social media posts. 
      
      YOUR CLIENT: ${scraper.clientName || scraper.name}
      YOUR SPECIFIC TARGET (Ideal Customer Profile): ${scraper.idealCustomerProfile || scraper.leadDefinition || 'General commercial intent'}
      
      Evaluate EACH AND EVERY post based on this target definition. 
      
      CRITICAL: You MUST return a score for EVERY post in the input array. Do not skip any.
      
      Score the intent from 1 to 10:
      - 1-3: No match to the target definition.
      - 4-6: Partial match or vague interest.
      - 7-10: Perfect match. The user is explicitly asking for exactly what is described in the target definition.
      
      If the score is >= 7, you MUST draft a short WhatsApp message to send to the client. 
      Use this exact template:
      "Hey ${scraper.clientName || 'there'}, I found a user by /u/[username] looking for [very brief summary of what they need]. They posted this recently. Here is the link: [URL]"
      (Note: Leave [URL] exactly as the literal string "[URL]", we will replace it in the code).
      
      Return ONLY a valid JSON array of objects. 
      Format: [{ "index": number, "score": number, "reason": "string", "isLead": boolean, "whatsappMessage": "string" }]
      
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
        console.error(`[Background Engine] AI Scoring failed for batch in ${scraper.name}:`, aiError.message || aiError);
        // Fallback: just use keyword matching if AI fails
        scoredBatch = minimizedData.map((post: any) => ({
          index: post.index,
          score: 5,
          reason: "AI scoring failed, fallback to keyword match",
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
      const hasKeyword = title.toLowerCase().includes(keywordLower) || selftext.toLowerCase().includes(keywordLower);
      const isAiLead = scoreObj.isLead === true || scoreObj.score >= 7;

      if (hasKeyword || isAiLead) {
        const postUrl = `https://www.reddit.com${post.data.permalink}`;
        
        let finalWhatsappMessage = scoreObj.whatsappMessage || `Hey ${scraper.clientName || 'there'}, I found a user by /u/${post.data.author} looking for something related to your business. Here is the link: [URL]`;
        finalWhatsappMessage = finalWhatsappMessage.replace('[URL]', postUrl);
        
        const newLeadRef = adminDb.collection('leads').doc();
        batchWrite.set(newLeadRef, {
          scraperId: scraper.id,
          subreddit: scraper.subreddit,
          keyword: scraper.keyword,
          postTitle: title.substring(0, 500),
          postUrl: postUrl.substring(0, 500),
          postAuthor: (post.data.author || 'unknown').substring(0, 100),
          postContent: selftext.substring(0, 10000),
          score: Math.max(1, Math.min(10, scoreObj.score || 5)), // Ensure score is 1-10
          reason: (scoreObj.reason || '').substring(0, 2000),
          status: 'new',
          whatsappMessage: finalWhatsappMessage.substring(0, 5000),
          createdAt: FieldValue.serverTimestamp(),
          userId: scraper.userId
        });
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

  } catch (error) {
    console.error(`[Background Engine] Error running scraper ${scraper.name}:`, error);
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
