import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppReadyContextValue {
  isReady: boolean;
}

const AppReadyContext = createContext<AppReadyContextValue | undefined>(undefined);

export const useAppReady = () => {
  const context = useContext(AppReadyContext);
  if (!context) {
    throw new Error('useAppReady must be used within AppReadyProvider');
  }
  return context;
};

interface AppReadyProviderProps {
  children: ReactNode;
  minBootDuration?: number;
  fallbackTimeout?: number;
}

declare global {
  interface Window {
    __hmSettingsReady?: boolean;
    __hmTranslationsReady?: boolean;
    __hmIconsReady?: boolean;
  }
}

type ReadyFlag = '__hmSettingsReady' | '__hmTranslationsReady';

export const AppReadyProvider: React.FC<AppReadyProviderProps> = ({
  children,
  minBootDuration = 1500,
  fallbackTimeout = 6000,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [bootStartedAt] = useState(() => Date.now());

  useEffect(() => {
    const shouldSkipBootstrap = (() => {
      if (typeof window === 'undefined') return false;
      try {
        return new URLSearchParams(window.location.search).get('skipBootstrap') === 'true';
      } catch {
        return false;
      }
    })();

    if (shouldSkipBootstrap) {
      if (typeof window !== 'undefined') {
        window.__hmSettingsReady = true;
        window.__hmTranslationsReady = true;
        window.__hmIconsReady = true;
      }
      setIsReady(true);
      return () => {};
    }

    let done = false;
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;
    const unsubscribes: Array<() => void> = [];

    const maybeFinish = () => {
      if (done || isUnmounted) return;
      const elapsed = Date.now() - bootStartedAt;
      const remain = Math.max(0, minBootDuration - elapsed);
      releaseTimer = setTimeout(() => {
        if (!isUnmounted) {
          setIsReady(true);
        }
      }, remain);
      done = true;
    };

    const waitForEventOrFlag = (eventName: string, flagKey: ReadyFlag) =>
      new Promise<void>((resolve) => {
        if (window[flagKey]) {
          resolve();
          return;
        }
        const handler = () => {
          window[flagKey] = true;
          resolve();
        };
        window.addEventListener(eventName, handler, { once: true });
        unsubscribes.push(() => window.removeEventListener(eventName, handler));
      });

    const waitForMaterialSymbols = async () => {
      if (window.__hmIconsReady) {
        return;
      }
      if (!('fonts' in document) || typeof document.fonts?.load !== 'function') {
        window.__hmIconsReady = true;
        return;
      }
      try {
        await document.fonts.load('1em "Material Symbols Outlined"');
      } catch {
        // Font loading failed, continue anyway
      }
      window.__hmIconsReady = true;
    };

    const run = async () => {
      try {
        await Promise.all([
          waitForEventOrFlag('hm:settings-ready', '__hmSettingsReady'),
          waitForEventOrFlag('hm:translations-ready', '__hmTranslationsReady'),
          waitForMaterialSymbols(),
        ]);
      } finally {
        maybeFinish();
      }
    };

    run();

    const fallback = setTimeout(() => {
      maybeFinish();
    }, fallbackTimeout);

    return () => {
      isUnmounted = true;
      unsubscribes.forEach((unsub) => unsub());
      if (releaseTimer) {
        clearTimeout(releaseTimer);
      }
      clearTimeout(fallback);
    };
  }, [bootStartedAt, minBootDuration, fallbackTimeout]);

  return (
    <AppReadyContext.Provider value={{ isReady }}>
      {children}
    </AppReadyContext.Provider>
  );
};
