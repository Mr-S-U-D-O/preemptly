import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthGate } from './components/AuthProvider';
import { DataProvider } from './components/DataProvider';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { ScraperView } from './components/ScraperView';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LogsView } from './components/LogsView';
import { ClientPortal } from './components/ClientPortal';
import { CRMView } from './components/CRMView';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LandingPage } from './components/public/LandingPage';
import { SmoothCursor } from './components/ui/smooth-cursor';
import { Toaster } from './components/ui/toast';

export default function App() {
  const hostname = window.location.hostname;
  
  // Traffic Cop Architecture
  // Support for: 
  // - bepreemptly.com (Public Landing)
  // - hq.bepreemptly.com (Admin/Ops Dashboard)
  // - portal.bepreemptly.com (Client Portals)
  
  const isPortal = hostname.startsWith('portal.');
  const isHQ = hostname.startsWith('hq.');
  const isPublic = hostname === 'bepreemptly.com' || hostname === 'www.bepreemptly.com' || (!isPortal && !isHQ && hostname === 'localhost');
  
  // Public facing site
  if (isPublic && !isPortal && !isHQ) {
    return (
      <TooltipProvider>
        <SmoothCursor />
        <Toaster />
        <LandingPage />
      </TooltipProvider>
    );
  }

  // Admin/Ops Dashboard or Client Portal
  return (
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <SmoothCursor />
          <Toaster />
          <BrowserRouter>
            <Routes>
              {/* Client Portal - no auth, no layout */}
              <Route path="/portal/:token" element={<ClientPortal />} />
              <Route path="/:token" element={<ClientPortal />} />

              {/* Admin routes - protected by AuthGate */}
              <Route path="/" element={<AuthGate><Layout /></AuthGate>}>
                <Route index element={<Home />} />
                <Route path="scraper/:id" element={<ScraperView />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
                <Route path="logs" element={<LogsView />} />
                <Route path="crm" element={<CRMView />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  );
}
