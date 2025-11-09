import React from 'react';
import { HashRouter } from 'react-router-dom';
import { SettingsProvider } from './hooks/useSettings';
import { TranslationProvider } from './hooks/useTranslation';
import { ToastProvider } from './hooks/useToast';
import AnimatedRoutes from './navigation/AnimatedRoutes';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <SettingsProvider>
        <TranslationProvider>
          <HashRouter>
            <AnimatedRoutes />
          </HashRouter>
        </TranslationProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default App;
