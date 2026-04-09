import { useEffect, useRef } from 'react';
import { Scraper, SystemLog } from '../types';
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../components/AuthProvider';
import { GoogleGenAI } from '@google/genai';

// Initialize AI on the frontend as per mandatory guidelines
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function useScraperEngine(scrapers: Scraper[]) {
  const { user } = useAuth();
  // Keep track of which scrapers are currently running to avoid overlapping runs
  const runningRef = useRef<Set<string>>(new Set());
  
  // Store scrapers in a ref so we don't re-trigger the effect when they update
  const scrapersRef = useRef(scrapers);

  useEffect(() => {
    scrapersRef.current = scrapers;
  }, [scrapers]);

  useEffect(() => {
    if (!user) return;

    const createLog = async (log: Omit<SystemLog, 'id' | 'createdAt' | 'userId'>) => {
      try {
        await addDoc(collection(db, 'logs'), {
          ...log,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.error('Failed to create log:', e);
      }
    };

    const runScraper = async (scraper: Scraper) => {
      if (runningRef.current.has(scraper.id)) return;
      runningRef.current.add(scraper.id);

      try {
        console.log(`Running scraper: ${scraper.name} for r/${scraper.subreddit}`);
        
        await createLog({
          type: 'scraper_run',
          scraperId: scraper.id,
          scraperName: scraper.name,
          message: `Scraper "${scraper.name}" started scanning r/${scraper.subreddit}`
        });

        // Fetch from local API proxy with retry logic
        const fetchWithRetry = async (url: string, retries = 3, delay = 5000): Promise<Response> => {
          const response = await fetch(url);
          if (response.status === 429 && retries > 0) {
            console.warn(`Rate limited (429). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, retries - 1, delay * 2);
          }
          return response;
        };

        // Add a random delay before running to stagger requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000));

        const response = await fetchWithRetry(`/api/reddit/${scraper.subreddit}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API returned ${response.status}`);
        }
        
        const rawPosts = await response.json();
        
        if (rawPosts.length === 0) {
          await createLog({
            type: 'scraper_run',
            scraperId: scraper.id,
            scraperName: scraper.name,
            message: `Scraper "${scraper.name}" completed scan. No recent posts found in r/${scraper.subreddit}.`
          });
          return;
        }

        // AI Scoring on the frontend
        let scoredPosts = [];
        try {
          const minimizedData = rawPosts.map((post: any) => ({
            index: post.data.index,
            title: post.data.title,
            content: post.data.selftext.substring(0, 800)
          }));

          const prompt = `You are an expert lead generation analyst. I am providing a JSON array of ${minimizedData.length} recent social media posts. 
          Evaluate EACH AND EVERY post for buying intent or service needs. 
          
          CRITICAL: You MUST return a score for EVERY post in the input array. Do not skip any.
          
          Score the intent from 1 to 10:
          - 1-3: General discussion, memes, news, or complaints with no need for a service.
          - 4-6: Vague interest or general questions about a topic.
          - 7-10: High intent. Actively looking for a recommendation, a tool, a service, or a professional to hire.
          
          Return ONLY a valid JSON array of objects. 
          Format: [{ "index": number, "score": number, "reason": "string", "isLead": boolean }]
          
          Input Data:
          ${JSON.stringify(minimizedData)}`;

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
          });

          const responseText = aiResponse.text || '[]';
          const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
          const scoredData = JSON.parse(cleanedText);

          // Map scores back
          scoredData.forEach((scoreObj: any) => {
            const post = rawPosts.find((p: any) => p.data.index === scoreObj.index);
            if (post) {
              post.data.score = scoreObj.score;
              post.data.reason = scoreObj.reason;
              post.data.isLead = scoreObj.isLead;
            }
          });
          
          scoredPosts = rawPosts;
        } catch (aiError) {
          console.error("AI Scoring failed on frontend:", aiError);
          scoredPosts = rawPosts; // Fallback to raw posts
        }

        const keywordLower = scraper.keyword.toLowerCase();
        let leadsFound = 0;
        
        for (const post of scoredPosts) {
          const postData = post.data;
          const title = postData.title || '';
          const selftext = postData.selftext || '';
          
          // Check if keyword matches title or content OR if AI marked it as lead
          const hasKeyword = title.toLowerCase().includes(keywordLower) || selftext.toLowerCase().includes(keywordLower);
          const isAiLead = postData.isLead === true || (postData.score && postData.score >= 7);

          if (hasKeyword || isAiLead) {
            // Check if we already have this lead to avoid duplicates
            const leadsRef = collection(db, 'leads');
            const q = query(
              leadsRef, 
              where('scraperId', '==', scraper.id),
              where('postUrl', '==', `https://www.reddit.com${postData.permalink}`),
              where('userId', '==', user.uid)
            );
            
            const existingDocs = await getDocs(q);
            
            if (existingDocs.empty) {
              // Save new lead
              const newLeadRef = doc(collection(db, 'leads'));
              try {
                const leadData: any = {
                  scraperId: scraper.id,
                  subreddit: scraper.subreddit,
                  keyword: scraper.keyword,
                  postTitle: title,
                  postUrl: `https://www.reddit.com${postData.permalink}`,
                  postAuthor: postData.author || 'unknown',
                  postContent: selftext.substring(0, 10000), // Limit size
                  createdAt: serverTimestamp(),
                  userId: user.uid
                };
                
                if (postData.score !== undefined) leadData.score = postData.score;
                if (postData.reason) leadData.reason = postData.reason;

                await setDoc(newLeadRef, leadData);
                leadsFound++;
                
                await createLog({
                  type: 'lead_found',
                  scraperId: scraper.id,
                  scraperName: scraper.name,
                  message: `New high-intent lead found in r/${scraper.subreddit}: "${title.substring(0, 50)}..."`,
                  details: `Score: ${postData.score || 'N/A'}/10 | Keyword: ${scraper.keyword}`
                });

                console.log(`Found new lead in r/${scraper.subreddit}: ${title}`);
              } catch (e) {
                console.error(`Failed to save lead for post ${title}:`, e);
              }
            }
          }
        }
        
        // Update lastRunAt
        const scraperRef = doc(db, 'scrapers', scraper.id);
        try {
          await updateDoc(scraperRef, {
            lastRunAt: serverTimestamp()
          });
        } catch (e) {
          console.error(`Failed to update lastRunAt for scraper ${scraper.name}:`, e);
          throw e; // Re-throw to be caught by the outer try/catch
        }
        
        if (leadsFound === 0) {
          await createLog({
            type: 'scraper_run',
            scraperId: scraper.id,
            scraperName: scraper.name,
            message: `Scraper "${scraper.name}" completed scan. No new leads found.`
          });
        }

      } catch (error) {
        console.error(`Error running scraper ${scraper.name}:`, error);
        await createLog({
          type: 'scraper_error',
          scraperId: scraper.id,
          scraperName: scraper.name,
          message: `Scraper "${scraper.name}" encountered an error: ${error instanceof Error ? error.message : String(error)}`
        });
      } finally {
        runningRef.current.delete(scraper.id);
      }
    };

    // Master loop to check all scrapers periodically
    const checkScrapers = () => {
      scrapersRef.current.forEach(scraper => {
        if (scraper.status === 'active') {
          const lastRun = scraper.lastRunAt?.toMillis?.() || 0;
          const intervalMs = scraper.intervalMinutes * 60 * 1000;
          // Run if it's never been run, or if the interval has passed
          if (Date.now() - lastRun >= intervalMs) {
            runScraper(scraper);
          }
        }
      });
    };

    // Check immediately on mount
    checkScrapers();

    // Then check every 30 seconds
    const masterInterval = setInterval(checkScrapers, 30000);

    return () => {
      clearInterval(masterInterval);
    };
  }, [user]); // Removed scrapers from dependency array to prevent infinite loop
}
