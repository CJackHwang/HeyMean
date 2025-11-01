
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { TranslationProvider } from './hooks/useTranslation';
import { ToastProvider } from './hooks/useToast';

// --- Direct Page Imports ---
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';


const App: React.FC = () => {
  return (
    <ToastProvider>
      <SettingsProvider>
        <TranslationProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </HashRouter>
        </TranslationProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default App;