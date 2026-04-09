# IntentFirstHunter

IntentFirstHunter is an automated lead generation platform that monitors Reddit for high-intent posts and uses Google's Gemini AI to score and filter them.

## How It Works

1. **Scrapers**: Users can create "Scrapers" that target specific subreddits and keywords. Each scraper runs on a defined interval (e.g., every 60 minutes).
2. **Background Engine**: The React frontend runs a background engine (`useScraperEngine`) that periodically checks if any active scrapers are due for a run.
3. **RSS Fetching**: When a scraper runs, it hits the Express backend (`/api/reddit/:subreddit`), which fetches the latest posts from Reddit's RSS feed (`https://www.reddit.com/r/.../.rss`).
4. **AI Lead Scoring**: The backend takes the fetched posts and sends them to the **Gemini AI** (`gemini-2.5-flash`). The AI acts as an expert lead generation analyst, scoring each post from 1-10 based on the user's target keyword and the post's intent (e.g., asking for recommendations, expressing a pain point).
5. **Filtering & Storage**: Only posts with a score of 6 or higher (warm/hot leads) are returned to the frontend. The frontend then saves these leads to Firebase Firestore.
6. **Real-time Dashboard**: The user interface updates in real-time, displaying new leads, analytics, and charts.

## File Structure & Details

### Root Directory
* **`server.ts`**: The Express backend server. It serves the Vite frontend and handles the core `/api/reddit/:subreddit` route. This route fetches Reddit RSS data, parses it, and uses the `@google/genai` SDK to score leads in batches to save tokens.
* **`vite.config.ts`**: Configuration for Vite, including React and Tailwind plugins. It also injects the `LEAD_SCORER_API_KEY` environment variable into the client build.
* **`package.json`**: Defines project dependencies (React, Firebase, Tailwind, Recharts, Lucide, etc.) and scripts.
* **`.env.example`**: Documents the required environment variables, specifically `LEAD_SCORER_API_KEY` for the Gemini AI.
* **`firebase-applet-config.json` & `firestore.rules`**: Firebase project configuration and security rules ensuring users can only access their own scrapers and leads.

### `src/` Directory
* **`main.tsx`**: The entry point for the React application.
* **`App.tsx`**: Sets up React Router and wraps the application in the `AuthProvider` and `DataProvider`.
* **`index.css`**: Global CSS file containing Tailwind imports, custom animations, and CSS variables for both light and dark mode themes.
* **`types.ts`**: TypeScript interfaces defining the shape of `Scraper` and `Lead` objects.
* **`firebase.ts`**: Initializes the Firebase app, Auth, and Firestore instances. It also includes a robust error handler for Firestore operations.

### `src/hooks/`
* **`useScraperEngine.ts`**: The heart of the automation. This custom hook runs globally. It sets up an interval that checks all active scrapers every 30 seconds. If a scraper is due, it triggers the backend API, processes the AI-scored results, checks for duplicates, and saves new leads to Firestore.

### `src/components/`
* **`AuthProvider.tsx`**: Manages Firebase Authentication state and provides user data and login/logout functions via context.
* **`DataProvider.tsx`**: Sets up real-time Firestore listeners (`onSnapshot`) for the current user's scrapers and leads. It provides this data globally so the UI always reflects the latest database state.
* **`Layout.tsx`**: The main application shell. It includes the Sidebar, the top header (with global search and user menu), and the main content area (`Outlet`).
* **`Sidebar.tsx`**: The left navigation menu. It displays links to the Home dashboard, a button to add new scrapers, and a collapsible list of deployed scrapers.
* **`Home.tsx`**: The main dashboard view. It displays high-level analytics (Total Leads, Success Rate), an area chart of lead generation over time, scraper status summaries, and a table of recent leads.
* **`ScraperView.tsx`**: The detailed view for a specific scraper. It allows users to pause/resume the scraper, force a manual run, delete the scraper, and view/search the leads generated specifically by that scraper.
* **`LeadsTable.tsx`**: A highly reusable table component for displaying leads. It includes built-in search filtering, column sorting (by clicking headers), and actions to view the post on Reddit or delete the lead.
* **`AddScraperModal.tsx`**: A modal form that allows users to create a new scraper by defining a name, subreddit, keyword, interval, and icon.
* **`SettingsModal.tsx`**: A modal for user preferences. It handles the Dark Mode toggle (persisted to `localStorage`) and provides functionality to export all leads to a CSV file.
* **`ProfileModal.tsx`**: A simple modal displaying the logged-in user's profile information.
* **`ConfirmModal.tsx`**: A reusable confirmation dialog used for destructive actions (like deleting a scraper).
* **`PrivacyPolicy.tsx`**: A static page displaying the application's privacy policy.
