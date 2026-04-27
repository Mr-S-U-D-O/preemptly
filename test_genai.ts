import * as dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const apiKey = process.env.LEAD_SCORER_API_KEY || process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey });

async function run() {
  try {
    const prompt = `You are a world-class marketing psychologist and lead generation expert.
      
      CLIENT: A business
      IDEAL CUSTOMER PROFILE: General commercial intent
      
      TASK: Based STRICTLY on the Ideal Customer Profile (IDP) provided above, suggest 15 high-intent "trigger phrases" or "active search keywords". 
      
      THINK: What EXACTLY would this specific persona type into a search bar if they were desperate for a solution? Avoid generic phrases. Prioritize specific pain points (e.g., "how to fix X", "alternative to Y that isn't Z", "recommendation for niche industry A").
      
      Return ONLY a valid JSON array of strings.
      Format: ["keyphrase1", "keyphrase2", ...]`;

    const aiResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        maxOutputTokens: 1500,
        temperature: 0.7,
      },
    });
    console.log("Success:", aiResponse.text);
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    console.error("Status:", error.status);
    console.error("Message:", error.message);
  }
}

run();
