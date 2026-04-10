# IntentFirstHunter

IntentFirstHunter is an automated lead generation platform that monitors Reddit for high-intent posts and uses Google's Gemini AI to score and filter them.

**Status: Stable Checkpoint**
- ✅ Background Engine running on Node.js server
- ✅ Firebase Admin SDK integration (Service Account auth)
- ✅ Gemini AI lead scoring with fallback mechanisms
- ✅ Recharts dashboard with minimalist, stable layout

## How It Works

1. **Scrapers**: Users can create "Scrapers" that target specific subreddits and keywords. Each scraper runs on a defined interval (e.g., every 60 minutes).
2. **Background Engine**: The Express backend runs a background engine (`server.ts`) that periodically checks if any active scrapers are due for a run.
3. **RSS Fetching**: When a scraper runs, it hits the Express backend (`/api/reddit/:subreddit`), which fetches the latest posts from Reddit's RSS feed (`https://www.reddit.com/r/.../.rss`).
4. **AI Lead Scoring**: The backend takes the fetched posts and sends them to the **Gemini AI** (`gemini-3-flash-preview`). The AI acts as an expert lead generation analyst, scoring each post from 1-10 based on the user's target keyword and the post's intent.
5. **Filtering & Storage**: Only posts with a score of 7 or higher (warm/hot leads) are saved. The backend uses the Firebase Admin SDK to bypass client-side rules and save leads directly to Firestore.
6. **Real-time Dashboard**: The user interface updates in real-time, displaying new leads, analytics, and charts.

## File Structure & Details

### Root Directory
* **`server.ts`**: The Express backend server. It serves the Vite frontend, handles the core `/api/reddit/:subreddit` route, and runs the background scraping engine. It uses the `@google/genai` SDK for AI scoring and `firebase-admin` for database operations.
* **`vite.config.ts`**: Configuration for Vite, including React and Tailwind plugins.
* **`package.json`**: Defines project dependencies (React, Firebase, Tailwind, Recharts, Lucide, etc.) and scripts.
* **`.env.example`**: Documents the required environment variables: `LEAD_SCORER_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, etc.
* **`firebase-applet-config.json` & `firestore.rules`**: Firebase project configuration and security rules.

### `src/` Directory
* **`main.tsx`**: The entry point for the React application.
* **`App.tsx`**: Sets up React Router and wraps the application in the `AuthProvider` and `DataProvider`.
* **`index.css`**: Global CSS file containing Tailwind imports, custom animations, and CSS variables for both light and dark mode themes.
* **`types.ts`**: TypeScript interfaces defining the shape of `Scraper` and `Lead` objects.
* **`firebase.ts`**: Initializes the Firebase app, Auth, and Firestore instances.

### `src/components/`
* **`AuthProvider.tsx`**: Manages Firebase Authentication state.
* **`DataProvider.tsx`**: Sets up real-time Firestore listeners (`onSnapshot`) for the current user's scrapers and leads.
* **`Layout.tsx`**: The main application shell.
* **`Sidebar.tsx`**: The left navigation menu.
* **`Home.tsx`**: The main dashboard view. Displays high-level analytics, an area chart of lead generation, scraper status summaries, and a table of recent leads.
* **`ScraperView.tsx`**: The detailed view for a specific scraper.
* **`LeadsTable.tsx`**: A highly reusable table component for displaying leads.
* **`AddScraperModal.tsx`**: A modal form that allows users to create a new scraper.
* **`SettingsModal.tsx`**: A modal for user preferences.
* **`ProfileModal.tsx`**: A simple modal displaying the logged-in user's profile information.
* **`ConfirmModal.tsx`**: A reusable confirmation dialog.
* **`PrivacyPolicy.tsx`**: A static page displaying the application's privacy policy.
