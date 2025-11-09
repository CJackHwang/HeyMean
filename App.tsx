import React from 'react';
import { HashRouter } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { TranslationProvider } from './hooks/useTranslation';
import { ToastProvider } from './hooks/useToast';
import { AppReadyProvider, useAppReady } from './providers/AppReadyProvider';
import AnimatedRoutes from './navigation/AnimatedRoutes';

const AppContent: React.FC = () => {
  const { isReady } = useAppReady();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-white">
        <img
          src="/heymeanlogo.svg"
          alt="HeyMean"
          className="w-56 h-56 sm:w-64 sm:h-64"
        />
      </div>
    );
  }

  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <SettingsProvider>
        <TranslationProvider>
          <AppReadyProvider>
            <AppContent />
          </AppReadyProvider>
        </TranslationProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default App;
