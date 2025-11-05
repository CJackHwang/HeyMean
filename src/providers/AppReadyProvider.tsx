import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Language } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { primeTranslationsCache } from '../../hooks/useTranslation';

const APP_READY_EVENT = 'hm:app-ready';
const BOOTSTRAP_VERSION = '2024-11-05';
const LOCALE_CACHE_PREFIX = `hm:locale:${BOOTSTRAP_VERSION}:`;
const ICON_CACHE_KEY = `hm:icons:${BOOTSTRAP_VERSION}`;
const ICON_FONT_CHECK = '1em "Material Symbols Outlined"';
const DEFAULT_TIMEOUT = 20000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 400;

export interface AppReadyAssetConfig {
  id: string;
  label: string;
  loader: () => Promise<void>;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

interface AppReadyAssetState {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  attempts: number;
  error?: string;
  fromCache?: boolean;
}

export interface AppReadyProgress {
  total: number;
  completed: number;
  items: AppReadyAssetState[];
}

export interface AppReadyError {
  assetId: string;
  message: string;
  attempts: number;
  cause?: string;
}

interface ReadyWaiter {
  resolve: () => void;
  reject: (error: AppReadyError) => void;
}

interface AppReadyContextValue {
  ready: boolean;
  progress: AppReadyProgress;
  error: AppReadyError | null;
  waitForReady: () => Promise<void>;
  retry: () => void;
  skipBootstrap: boolean;
  preloadedLocales: Record<string, Record<string, string>>;
}

interface AppReadyProviderProps {
  children: React.ReactNode;
  assets?: AppReadyAssetConfig[];
}

interface LocaleCacheEntry {
  version: string;
  updatedAt: number;
  data: Record<string, string>;
}

type LocaleMap = Record<string, Record<string, string>>;

const AppReadyContext = createContext<AppReadyContextValue | undefined>(undefined);

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

const readLocaleCache = (language: string): LocaleCacheEntry | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${LOCALE_CACHE_PREFIX}${language}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocaleCacheEntry;
    if (parsed && parsed.version === BOOTSTRAP_VERSION && parsed.data && typeof parsed.data === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('Unable to read locale cache:', error);
  }
  return null;
};

const writeLocaleCache = (language: string, data: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    const payload: LocaleCacheEntry = {
      version: BOOTSTRAP_VERSION,
      updatedAt: Date.now(),
      data,
    };
    window.localStorage.setItem(`${LOCALE_CACHE_PREFIX}${language}`, JSON.stringify(payload));
  } catch (error) {
    console.warn('Unable to write locale cache:', error);
  }
};

const readIconCache = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ICON_CACHE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

const writeIconCache = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ICON_CACHE_KEY, String(Date.now()));
  } catch (error) {
    console.warn('Unable to persist icon cache marker:', error);
  }
};

const fetchLocale = async (language: string): Promise<Record<string, string>> => {
  const baseUrl = typeof window !== 'undefined' ? import.meta.env.BASE_URL || '/' : '/';
  const response = await fetch(`${baseUrl}locales/${language}.json?v=${BOOTSTRAP_VERSION}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${language}.json (${response.status})`);
  }
  const data = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid locale payload for ${language}`);
  }
  return data as Record<string, string>;
};

const ensureFontAvailable = async () => {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }
  const fonts = (document as Document & { fonts: FontFaceSet }).fonts;
  if (fonts.check(ICON_FONT_CHECK)) {
    return;
  }
  await withTimeout(fonts.load(ICON_FONT_CHECK), 7000, 'Icon font');
  if (!fonts.check(ICON_FONT_CHECK)) {
    throw new Error('Icon font not available after loading');
  }
};

export const AppReadyProvider: React.FC<AppReadyProviderProps> = ({ children, assets }) => {
  const { language: selectedLanguage } = useSettings();
  const language = selectedLanguage || Language.EN;

  const skipBootstrap = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
      return params.get('skipBootstrap') === 'true';
    } catch {
      return false;
    }
  }, []);

  const [ready, setReady] = useState<boolean>(skipBootstrap);
  const [error, setError] = useState<AppReadyError | null>(null);
  const [runId, setRunId] = useState(0);
  const [preloadedLocales, setPreloadedLocales] = useState<LocaleMap>({});

  const waitersRef = useRef<ReadyWaiter[]>([]);
  const hasDispatchedReadyRef = useRef(skipBootstrap);

  const createDefaultAssets = useCallback((): AppReadyAssetConfig[] => {
    const loadLocales = async () => {
      const fallback = Language.EN;
      const uniqueLangs = Array.from(new Set([fallback, language]));
      const loadedLocales: LocaleMap = {};

      await Promise.all(
        uniqueLangs.map(async (lang) => {
          const cached = readLocaleCache(lang);
          if (cached) {
            loadedLocales[lang] = cached.data;
            primeTranslationsCache(lang, cached.data);
            void fetchLocale(lang)
              .then((fresh) => {
                writeLocaleCache(lang, fresh);
                primeTranslationsCache(lang, fresh);
                setPreloadedLocales((prev) => ({ ...prev, [lang]: fresh }));
              })
              .catch((error) => {
                console.warn(`Background refresh for locale ${lang} failed:`, error);
              });
            return;
          }

          const fresh = await fetchLocale(lang);
          writeLocaleCache(lang, fresh);
          primeTranslationsCache(lang, fresh);
          loadedLocales[lang] = fresh;
        }),
      );

      setPreloadedLocales((prev) => ({ ...prev, ...loadedLocales }));

      uniqueLangs.forEach((lang) => {
        if (!loadedLocales[lang]) {
          throw new Error(`Locale ${lang} failed to load`);
        }
      });
    };

    const loadIcons = async () => {
      const cached = readIconCache();
      if (cached) {
        if (typeof document !== 'undefined' && 'fonts' in document) {
          const fonts = (document as Document & { fonts: FontFaceSet }).fonts;
          if (fonts.check(ICON_FONT_CHECK)) {
            return;
          }
        }
      }

      try {
        await ensureFontAvailable();
        writeIconCache();
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unable to load icon resources');
      }
    };

    return [
      {
        id: 'locales',
        label: 'Loading language resources',
        loader: loadLocales,
      },
      {
        id: 'icons',
        label: 'Preparing icon set',
        loader: loadIcons,
        timeoutMs: 8000,
      },
    ];
  }, [language]);

  const assetConfigs = useMemo(() => assets ?? createDefaultAssets(), [assets, createDefaultAssets]);

  const [assetStates, setAssetStates] = useState<Record<string, AppReadyAssetState>>(() => {
    const next: Record<string, AppReadyAssetState> = {};
    assetConfigs.forEach((asset) => {
      next[asset.id] = {
        id: asset.id,
        label: asset.label,
        status: skipBootstrap ? 'success' : 'pending',
        attempts: 0,
      };
    });
    return next;
  });

  useEffect(() => {
    setAssetStates(() => {
      const next: Record<string, AppReadyAssetState> = {};
      assetConfigs.forEach((asset) => {
        next[asset.id] = {
          id: asset.id,
          label: asset.label,
          status: skipBootstrap ? 'success' : 'pending',
          attempts: 0,
        };
      });
      return next;
    });
  }, [assetConfigs, skipBootstrap]);

  const progress = useMemo<AppReadyProgress>(() => {
    const items = assetConfigs.map((asset) => assetStates[asset.id] ?? {
      id: asset.id,
      label: asset.label,
      status: skipBootstrap ? 'success' : 'pending',
      attempts: 0,
    });
    const completed = items.filter((item) => item.status === 'success').length;
    return {
      total: assetConfigs.length,
      completed,
      items,
    };
  }, [assetConfigs, assetStates, skipBootstrap]);

  const resolveWaiters = useCallback(() => {
    waitersRef.current.forEach((waiter) => waiter.resolve());
    waitersRef.current = [];
  }, []);

  const rejectWaiters = useCallback((err: AppReadyError) => {
    waitersRef.current.forEach((waiter) => waiter.reject(err));
    waitersRef.current = [];
  }, []);

  const waitForReadyFn = useCallback(() => {
    if (ready) {
      return Promise.resolve();
    }
    if (error) {
      return Promise.reject(error);
    }
    return new Promise<void>((resolve, reject) => {
      waitersRef.current.push({ resolve, reject });
    });
  }, [ready, error]);

  const retry = useCallback(() => {
    setRunId((previous) => previous + 1);
  }, []);

  useEffect(() => {
    if (skipBootstrap) {
      if (!hasDispatchedReadyRef.current && typeof window !== 'undefined') {
        hasDispatchedReadyRef.current = true;
        try {
          window.dispatchEvent(new Event(APP_READY_EVENT));
        } catch {}
      }
      resolveWaiters();
      return;
    }

    let cancelled = false;

    const run = async () => {
      setReady(false);
      setError(null);
      setAssetStates((prev) => {
        const next: Record<string, AppReadyAssetState> = {};
        assetConfigs.forEach((asset) => {
          next[asset.id] = {
            id: asset.id,
            label: asset.label,
            status: 'pending',
            attempts: 0,
          };
        });
        return next;
      });

      for (const asset of assetConfigs) {
        if (cancelled) {
          return;
        }

        const maxRetries = asset.maxRetries ?? DEFAULT_RETRIES;
        const timeoutMs = asset.timeoutMs ?? DEFAULT_TIMEOUT;
        const retryDelayMs = asset.retryDelayMs ?? DEFAULT_RETRY_DELAY;

        let attempt = 0;
        let success = false;
        let lastError: unknown = null;

        while (attempt < maxRetries && !cancelled) {
          attempt += 1;
          setAssetStates((prev) => ({
            ...prev,
            [asset.id]: {
              id: asset.id,
              label: asset.label,
              status: 'loading',
              attempts: attempt,
            },
          }));

          try {
            await withTimeout(asset.loader(), timeoutMs, asset.label);
            success = true;
            break;
          } catch (err) {
            lastError = err;
            setAssetStates((prev) => ({
              ...prev,
              [asset.id]: {
                id: asset.id,
                label: asset.label,
                status: 'error',
                attempts: attempt,
                error: err instanceof Error ? err.message : String(err ?? 'Unknown error'),
              },
            }));
            if (attempt < maxRetries) {
              await delay(retryDelayMs);
            }
          }
        }

        if (!success) {
          if (cancelled) return;
          const message =
            lastError instanceof Error
              ? lastError.message
              : typeof lastError === 'string'
                ? lastError
                : 'Asset failed to load';
          const appError: AppReadyError = {
            assetId: asset.id,
            message,
            attempts: attempt,
            cause: lastError instanceof Error ? lastError.stack ?? lastError.message : undefined,
          };
          setError(appError);
          rejectWaiters(appError);
          return;
        }

        setAssetStates((prev) => ({
          ...prev,
          [asset.id]: {
            id: asset.id,
            label: asset.label,
            status: 'success',
            attempts: attempt,
          },
        }));
      }

      if (!cancelled) {
        setReady(true);
        setError(null);
        resolveWaiters();
        if (typeof window !== 'undefined' && !hasDispatchedReadyRef.current) {
          hasDispatchedReadyRef.current = true;
          try {
            window.dispatchEvent(new Event(APP_READY_EVENT));
          } catch {}
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [assetConfigs, resolveWaiters, rejectWaiters, runId, skipBootstrap]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    (window as unknown as { __hmAppReady?: boolean }).__hmAppReady = true;
  }, [ready]);

  const contextValue = useMemo<AppReadyContextValue>(() => ({
    ready,
    progress,
    error,
    waitForReady: waitForReadyFn,
    retry,
    skipBootstrap,
    preloadedLocales,
  }), [ready, progress, error, waitForReadyFn, retry, skipBootstrap, preloadedLocales]);

  return <AppReadyContext.Provider value={contextValue}>{children}</AppReadyContext.Provider>;
};

export const useAppReady = (): AppReadyContextValue => {
  const context = useContext(AppReadyContext);
  if (!context) {
    throw new Error('useAppReady must be used within an AppReadyProvider');
  }
  return context;
};

export const waitForReady = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const readyFlag = (window as unknown as { __hmAppReady?: boolean }).__hmAppReady;
  if (readyFlag) {
    callback();
    return () => {};
  }
  const handler = () => {
    callback();
  };
  window.addEventListener(APP_READY_EVENT, handler, { once: true });
  return () => window.removeEventListener(APP_READY_EVENT, handler);
};
