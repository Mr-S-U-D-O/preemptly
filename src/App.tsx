import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { DataProvider } from './components/DataProvider';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { ScraperView } from './components/ScraperView';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LogsView } from './components/LogsView';
import { ClientPortal } from './components/ClientPortal';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              {/* Client Portal - no auth, no layout */}
              <Route path="/portal/:token" element={<ClientPortal />} />

              {/* Admin routes - authenticated with sidebar */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="scraper/:id" element={<ScraperView />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="logs" element={<LogsView />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  );
}
