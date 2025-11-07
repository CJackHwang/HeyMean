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
      <div className="flex items-center justify-center min-h-dvh bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <span className="material-symbols-outlined text-2xl!">hourglass_bottom</span>
          <p className="text-sm">HeyMean 正在准备...</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">加载资源中，请稍候</p>
        </div>
      </div>
    );
  }

  return (
    <TranslationProvider>
      <HashRouter>
        <AnimatedRoutes />
      </HashRouter>
    </TranslationProvider>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <SettingsProvider>
        <AppReadyProvider>
          <AppContent />
        </AppReadyProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default App;
