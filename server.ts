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
import Parser from 'rss-parser';

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

// Rules update logic
async function updateFirestoreRules(res: any) {
  try {
    const rules = readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
    
    // Use the security rules API to update rules for the named database
    const rulesClient = getSecurityRules(getApp()) as any;
    const ruleset = await rulesClient.createRuleset({
      files: [{ name: 'firestore.rules', content: rules }]
    });
    await rulesClient.releaseRuleset(`cloud.firestore${databaseId ? `/${databaseId}` : ''}`, ruleset.name);
    
    res.json({ success: true, message: "Firestore rules updated successfully" });
  } catch (error: any) {
    console.error("Error updating rules:", error);
    res.status(500).json({ 
      error: "Failed to update rules", 
      message: error.message,
      code: error.code,
      details: error.details || "Check server logs for more details"
    });
  }
}

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
  const PORT = process.env.PORT || 8080;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/admin/update-rules", async (req, res) => {
    await updateFirestoreRules(res);
  });

  app.post("/api/suggest-keywords", express.json(), async (req, res) => {
    try {
      const { clientName, idealCustomerProfile } = req.body;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const prompt = `You are an expert marketing strategist and lead generation specialist.
      
      CLIENT: ${clientName || 'A business'}
      IDEAL CUSTOMER PROFILE: ${idealCustomerProfile || 'General commercial intent'}
      
      Based on this profile, suggest 15 high-intent keywords or short phrases that potential customers would use when looking for this business's services on platforms like Reddit, Craigslist, or Hacker News.
      
      Focus on "problem-aware" and "solution-aware" keywords (e.g., "need a plumber", "recommend a lawyer", "looking for web design").
      
      Return ONLY a valid JSON array of strings.
      Format: ["keyword1", "keyword2", ...]`;

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
      res.status(500).json({ error: error.message || "Failed to suggest keywords" });
    }
  });

  app.post("/api/suggest-targets", express.json(), async (req, res) => {
    try {
      const { clientName, idealCustomerProfile, platforms } = req.body;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key not configured" });
      }

      const prompt = `You are an expert marketing strategist.
      
      CLIENT: ${clientName || 'A business'}
      IDEAL CUSTOMER PROFILE: ${idealCustomerProfile || 'General commercial intent'}
      PLATFORMS: ${platforms?.join(', ') || 'Reddit'}
      
      Based on this profile, suggest 10-15 specific "Targets" where these ideal customers are likely to hang out or post.
      
      - For Reddit: Suggest specific subreddits (e.g., "Entrepreneur", "reactjs", "smallbusiness").
      - For Stack Overflow: Suggest specific tags (e.g., "javascript", "python", "css").
      - For Craigslist/Hacker News: Suggest general search terms or categories.
      
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
      res.status(500).json({ error: error.message || "Failed to suggest targets" });
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

  app.post("/api/scrapers/:id/run", async (req, res) => {
    try {
      const { id } = req.params;
      const scraperDoc = await adminDb.collection('scrapers').doc(id).get();
      
      if (!scraperDoc.exists) {
        return res.status(404).json({ error: "Scraper not found" });
      }
      
      const scraper = { id: scraperDoc.id, ...scraperDoc.data() };
      
      // Execute scraper in background to avoid timeout
      executeScraper(scraper).catch(err => {
        console.error(`[API] Background execution failed for scraper ${id}:`, err);
      });
      
      return res.json({ success: true, message: "Scraper run started in background" });
    } catch (error) {
      console.error("Error starting scraper via API:", error);
      res.status(500).json({ error: "Failed to start scraper" });
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
    
    // Pre-fetch existing leads for this scraper to avoid N+1 queries
    const leadsRef = adminDb.collection('leads');
    const existingLeadsSnapshot = await leadsRef
      .where('scraperId', '==', scraper.id)
      .orderBy('createdAt', 'desc')
      .limit(1000) // Look at the last 1000 leads to check for duplicates
      .get();
    
    const existingUrls = new Set(existingLeadsSnapshot.docs.map((doc: any) => doc.data().postUrl));

    // Filter out posts we already have
    const newPosts = rawPosts.filter((post: any) => {
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
        author: post.data.author || 'the author',
        content: post.data.selftext.substring(0, 500) // Limit content length per post
      }));

      const prompt = `You are an expert lead generation analyst. I am providing a JSON array of ${minimizedData.length} recent social media posts. 
      
      YOUR CLIENT: ${scraper.clientName || scraper.name}
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
      - 7-10: High-intent lead. The user is actively seeking a solution right now.
      
      If the score is >= 7, you MUST draft a persuasive WhatsApp message to send to the client (the business owner). 
      The goal is to summarize the lead and provide context so the recipient understands the value immediately.
      
      Use this structure:
      "Hey ${scraper.clientName || 'there'}, I found a high-intent lead for you regarding \"[Snippet of Post Title]\"! 
      
      [2-3 sentences providing deeper context into what the user is asking and WHY this is a perfect match for your business based on the Ideal Customer Profile]. 
      
      User: [username]
      Link: [URL]"
      
      (Note: Leave [URL] and [username] exactly as those literal strings, we will replace them in the code).
      
      Return ONLY a valid JSON array of objects. 
      Format: [{ 
        "index": number, 
        "score": number, 
        "reason": "string", 
        "isLead": boolean, 
        "whatsappMessage": "string",
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
      const titleLower = title.toLowerCase();
      const selftextLower = selftext.toLowerCase();
      
      const hasKeyword = keywords.length === 0 || keywords.some((kw: string) => 
        titleLower.includes(kw) || selftextLower.includes(kw)
      );
      
      const isAiLead = scoreObj.isLead === true || scoreObj.score >= 7;

      if (hasKeyword || isAiLead) {
        let postUrl = '';
        if (scraper.platform === 'stackoverflow') {
          postUrl = `https://stackoverflow.com${post.data.permalink}`;
        } else if (scraper.platform === 'hackernews') {
          postUrl = `https://news.ycombinator.com${post.data.permalink}`;
        } else if (scraper.platform === 'craigslist') {
          postUrl = post.data.permalink; // Craigslist links are absolute
        } else {
          postUrl = `https://www.reddit.com${post.data.permalink}`;
        }
        
        let finalWhatsappMessage = scoreObj.whatsappMessage || `Hey ${scraper.clientName || 'there'}, I found a user by /u/${post.data.author} looking for something related to your business. Here is the link: [URL]`;
        finalWhatsappMessage = finalWhatsappMessage
          .replace(/\[URL\]/gi, postUrl)
          .replace(/\[username\]/gi, post.data.author || 'the author');
        
        const newLeadRef = adminDb.collection('leads').doc();
        batchWrite.set(newLeadRef, {
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
