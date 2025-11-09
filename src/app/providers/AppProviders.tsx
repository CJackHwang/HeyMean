import React from 'react';
import { ToastProvider } from './useToast';
import { SettingsProvider } from './useSettings';
import { TranslationProvider } from './useTranslation';
import { AppReadyProvider } from './AppReadyProvider';
import { ViewportProvider } from './ViewportProvider';

interface AppProvidersProps {
  children: React.ReactNode;
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ToastProvider>
      <SettingsProvider>
        <TranslationProvider>
          <ViewportProvider>
            <AppReadyProvider>
              {children}
            </AppReadyProvider>
          </ViewportProvider>
        </TranslationProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default AppProviders;
