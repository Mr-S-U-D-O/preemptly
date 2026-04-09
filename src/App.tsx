import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { DataProvider } from './components/DataProvider';
import { Layout } from './components/Layout';
import { Home } from './components/Home';
import { ScraperView } from './components/ScraperView';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { LogsView } from './components/LogsView';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="scraper/:id" element={<ScraperView />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="logs" element={<LogsView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
