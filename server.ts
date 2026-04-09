import express from "express";
import * as dotenv from "dotenv";
dotenv.config();

import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.LEAD_SCORER_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/debug-env", (req, res) => {
    res.json({ 
      hasKey: !!process.env.LEAD_SCORER_API_KEY, 
      keyLength: process.env.LEAD_SCORER_API_KEY ? process.env.LEAD_SCORER_API_KEY.length : 0,
      keyStart: process.env.LEAD_SCORER_API_KEY ? process.env.LEAD_SCORER_API_KEY.substring(0, 5) : null,
      isStringUndefined: process.env.LEAD_SCORER_API_KEY === "undefined"
    });
  });

  app.get("/api/reddit/:subreddit", async (req, res) => {
    try {
      const { subreddit } = req.params;
      
      // Use RSS feed via rss2json to bypass Reddit's strict IP blocking
      const rssUrl = encodeURIComponent(`https://www.reddit.com/r/${subreddit}/new.rss`);
      const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: `RSS API returned ${response.status}` });
      }
      
      const data = await response.json();
      
      if (data.status !== 'ok') {
        return res.status(500).json({ error: "Failed to parse RSS feed" });
      }
      
      const items = data.items || [];
      
      // Map the RSS output to match the exact frontend data structure
      const mappedPosts = items.map((item: any, index: number) => {
        // Extract relative path for permalink since frontend prepends the domain
        let permalink = item.link || '';
        try {
          permalink = new URL(item.link).pathname;
        } catch (e) {
          permalink = permalink.replace('https://www.reddit.com', '');
        }
        
        // RSS feeds often use 'description' instead of 'content'
        const rawContent = item.content || item.description || '';
        
        return {
          data: {
            index,
            title: item.title || '',
            // Strip HTML tags from content to simulate Reddit's selftext
            selftext: rawContent.replace(/<[^>]*>?/gm, ''),
            author: (item.author || '').replace('/u/', ''),
            permalink: permalink
          }
        };
      });
      
      try {
        if (!API_KEY) {
          throw new Error("API key is missing. Please set LEAD_SCORER_API_KEY in the environment secrets.");
        }

        // Create minimized data for AI to save tokens
        const minimizedData = mappedPosts.map((post: any) => ({
          index: post.data.index,
          title: post.data.title,
          content: post.data.selftext.substring(0, 1000) // truncate to save tokens
        }));

        const prompt = `You are an expert lead generation analyst. I am providing a JSON array of recent local social media posts. Evaluate each post for local buying intent or service needs. Score the intent from 1 to 10. A score of 1 means they are sharing a meme, complaining, or sharing news. A score of 10 means they have their credit card out and are actively asking to hire a business, find a service, or buy a product. Return ONLY a valid JSON array of objects matching the exact order of the input. Format: [{ "index": 0, "score": 8, "reason": "Actively looking for a plumber", "isLead": true }]. Do not use markdown blocks.\n\n${JSON.stringify(minimizedData)}`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const responseText = aiResponse.text || '[]';
        // Clean up potential markdown blocks if the model still outputs them
        const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const scoredData = JSON.parse(cleanedText);

        // Map scores back to the original array
        scoredData.forEach((scoreObj: any) => {
          const post = mappedPosts.find((p: any) => p.data.index === scoreObj.index);
          if (post) {
            post.data.score = scoreObj.score;
            post.data.reason = scoreObj.reason;
            post.data.isLead = scoreObj.isLead;
          }
        });

        // Filter the final array
        const filteredPosts = mappedPosts.filter((post: any) => post.data.isLead === true || post.data.score >= 6);
        
        // Clean up the index property before sending
        filteredPosts.forEach((post: any) => delete post.data.index);

        return res.json(filteredPosts);

      } catch (aiError) {
        console.error("AI Scoring failed, returning raw posts:", aiError);
        // Clean up the index property before sending
        mappedPosts.forEach((post: any) => delete post.data.index);
        return res.json(mappedPosts);
      }
    } catch (error) {
      console.error("Error fetching from RSS API:", error);
      res.status(500).json({ error: "Failed to fetch from RSS" });
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
  });
}

startServer();
