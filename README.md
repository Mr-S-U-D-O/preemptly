# IntentFirstHunter: Real-time Growth Intelligence Engine
 
IntentFirstHunter is a high-performance **Real-time Growth Intelligence platform** designed to identify and intercept business opportunities the millisecond they appear online. It utilizes **Google’s Gemini 3 Flash AI** to scan social platforms (Reddit, Stack Overflow, Hacker News, Craigslist) for high-intent signals—identifying users who are actively seeking solutions and calculating the system's **Reaction Time** to give you a definitive speed advantage.

---

## 🏗️ System Architecture

The application is built on a "Real-time Intelligence Loop" where background workers, AI models, and live dashboards operate in a continuous cycle.

```mermaid
graph TD
    subgraph "The Internet"
        R[Reddit RSS]
        SO[Stack Overflow Feed]
        HN[Hacker News Feed]
        CL[Craigslist Feed]
    end

    subgraph "Backend Engine (server.ts)"
        CRON[Background Loop - 60s]
        FETCHER[RSS Bypass Fetcher]
        GENAI[Gemini 3 Flash AI]
        ADMIN[Firebase Admin SDK]
    end

    subgraph "Data & UI"
        FS[(Cloud Firestore)]
        VITE[Vite + React SPA]
        DASH[Intelligence Hub]
    end

    CRON --> FETCHER
    FETCHER --> R & SO & HN & CL
    FETCHER -- "New Posts" --> GENAI
    GENAI -- "Intent Scores & Velocity" --> ADMIN
    ADMIN -- "Sync" --> FS
    FS -- "onSnapshot" --> VITE
    VITE --> DASH
    DASH -- "User Actions" --> ADMIN
```

---

## 🧠 The "Brain": AI Scrutiny Logic

While traditional scrapers look for `keyword == "plumber"`, IntentFirstHunter looks for **Intent**.

### How the Machine "Thinks"
When a post is fetched, it is sent to **Gemini 3 Flash** in optimized batches. The machine is programmed to look for specific behavioral signals:
1.  **Explicit Requests**: "Can anyone recommend a service for...?"
2.  **Pain Points**: "I'm so frustrated with my current [Solution]..."
3.  **Exploratory Questions**: "Does anyone know how to solve [Problem X]?"
4.  **High-Intent Phrases**: "What is the best [X] for [Y]?"

### Scoring Algorithm
*   **1-3 (Cold)**: General discussion, news, or unrelated content.
*   **4-6 (Warm)**: Vague interest or early-stage research.
*   **7-10 (Hot)**: High-intent lead. The user is actively seeking a solution *now*.

### ⚡ The "Reaction Gap" (Competitive Advantage)
The platform measures the gap between when a post was created on the source platform and when it was identified by our engine.
- **Velocity Tracking**: Every match includes a "Reaction Time" badge (e.g., "12m Reaction").
- **First-Responder Psychology**: By identifying opportunities in real-time, we allow businesses to be the *first* to reach out, which is the single highest predictor of conversion.

### Automated Intelligence Dispatch
For every match with a score of 7+, the AI generates a **personalized outreach dispatch**. 
- It contextually understands the user's specific problem.
- It drafts a 2-sentence value proposition targeted at the business owner's identity.
- It enables immediate action via the **WhatsApp Dispatch** button.

---

## ⚙️ The Backend Engine

The backend is a robust Node.js server powered by **Express** and **Hono-style routing**, serving as a bridge between the browser and the raw internet.

### 1. The RSS Bypass Technique
Platforms like Reddit have strict IP blocking for standard scrapers. IntentFirstHunter bypasses this by:
*   Using **RSS Feeds** instead of the JSON API.
*   Routing requests through **rss2json** and standard RSS parsers to distribute request footprints.
*   Implementing **Randomized Delays** (1s - 3s) between platform fetches to mimic human interaction.

### 2. Background Surveillance Loop
The server runs a `setInterval` worker every 60 seconds.
- It identifies "Active" intelligence monitors.
- It calculates the `nextRun` based on the user-defined interval.
- It executes the `executeScraper` function, which handles the full pipeline: Fetch -> Batch -> Score -> Save (with Reaction Time capture).

---

## 🎨 The (Frontend) Dashboard

The frontend is a **Vite-powered React SPA** built for speed and visual clarity.

-   **State Management**: Uses a custom `DataProvider` with React Context. It maintains a **real-time WebSocket-like connection** to Firestore using the `onSnapshot` listener. As soon as the backend identifies a lead, it "pops" onto the user's screen without a refresh.
-   **Data Visualization**: Uses **Recharts** to process raw lead data into trend lines (Lead Velocity) and distribution charts (Scraper Health).
-   **Security**: Minimalist design with **Firebase Auth** guarding access, ensuring each user only sees their own intelligence data.

---

## 🚀 The User Flow: From Signal to Sale

### 1. Initializing the Engine
When a user clicks **"Deploy Monitor"**, they aren't just setting up a search; they are configuring a digital hunter.
- **Identity (Internal)**: What is this monitor called?
- **Ideal Customer Profile**: What does a "perfect match" look like to our AI?
- **Target**: Which platform "hunting grounds" should the engine surveil?

### 2. Intercepting the Opportunity
When a match is identified:
- The backend writes the intelligence data to Firestore.
- The UI triggers an animation in the **"Intelligence Stream"** feed.
- The **Reaction Time** and **AI Logic** appear, explaining *how fast* and *why* the machine thinks this is a match.

### 3. Closing the Gap
Within the **Intelligence View**, the user can:
- Review the post content and original source timestamp.
- See the AI's logic and intent score.
- Click **"Dispatch WhatsApp"**: This opens a pre-composed message in a new tab, ready for the business owner to hit "Send" and win the deal.

---

## 🛠️ Technical Stack

-   **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons.
-   **Charts**: Recharts (High-performance SVG charting).
-   **Backend**: Node.js, Express, Google Generative AI (Gemini Flash).
-   **Database**: Google Firebase (Firestore + Authentication).
-   **RSS Logic**: `rss-parser`, `node-fetch`.

---

## 📦 Getting Started

1.  **Environment Variables**: Create a `.env` with:
    ```env
    LEAD_SCORER_API_KEY=your_gemini_api_key
    FIREBASE_SERVICE_ACCOUNT=your_service_account_json
    ```
2.  **Install Dependencies**: `npm install`
3.  **Run Development**: `npm run dev` (Starts both the backend engine and the Vite server).
4.  **Production**: `npm run build && npm start`
