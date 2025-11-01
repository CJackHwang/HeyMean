
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { TranslationProvider } from './hooks/useTranslation';
import { ToastProvider } from './hooks/useToast';

// --- Direct Page Imports (eager for seamless switches) ---
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));


const App: React.FC = () => {
  return (
    <ToastProvider>
      <SettingsProvider>
        <TranslationProvider>
          <HashRouter>
            <React.Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
            </React.Suspense>
          </HashRouter>
        </TranslationProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default App;
