
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSettings } from './useSettings';
import { Language } from '../types';
import { useToast } from './useToast';

interface TranslationContextType {
  t: (key: string, ...args: (string | number)[]) => string;
  language: Language;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// A simple cache for translations
const translationsCache: Record<string, Record<string, string>> = {};

// Exposed function to prime the cache from AppReadyProvider
export const primeTranslationsCache = (lang: string, data: Record<string, string>): void => {
  translationsCache[lang] = data;
};

interface TranslationProviderProps {
  children: React.ReactNode;
  initialTranslations?: Record<string, Record<string, string>>;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children, initialTranslations }) => {
  const { language } = useSettings();
  const { showToast } = useToast();
  const [translations, setTranslations] = useState<Record<string, string>>(() => {
    if (initialTranslations?.[language]) {
      translationsCache[language] = initialTranslations[language];
      return initialTranslations[language];
    }
    return translationsCache[language] || {};
  });

  const fetchTranslations = useCallback(async (lang: string) => {
    if (translationsCache[lang]) {
      setTranslations(translationsCache[lang]);
      return;
    }
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${baseUrl}locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Could not load ${lang}.json`);
      }
      const data = await response.json();
      translationsCache[lang] = data;
      setTranslations(data);
    } catch (error) {
      console.error(error);
      if (lang !== 'en') {
        showToast(t('toast.translation_fallback', lang), 'error');
        await fetchTranslations('en');
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (initialTranslations) {
      Object.entries(initialTranslations).forEach(([lang, data]) => {
        translationsCache[lang] = data;
      });
    }
  }, [initialTranslations]);

  useEffect(() => {
    if (initialTranslations?.[language]) {
      const data = initialTranslations[language];
      translationsCache[language] = data;
      setTranslations(data);
      return;
    }
    if (translationsCache[language]) {
      setTranslations(translationsCache[language]);
      return;
    }
    fetchTranslations(language);
  }, [language, fetchTranslations, initialTranslations]);

  const t = (key: string, ...args: (string | number)[]): string => {
    let translation = translations[key] || key;
    // Simple replacement for placeholders like {0}, {1}
    if (args.length > 0) {
      args.forEach((arg, index) => {
        translation = translation.replace(`{${index}}`, String(arg));
      });
    }
    return translation;
  };

  const value = { t, language };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
