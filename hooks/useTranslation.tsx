import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSettings } from './useSettings';
import { Language } from '../types';

interface TranslationContextType {
  t: (key: string, ...args: any[]) => string;
  language: Language;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// A simple cache for translations
const translationsCache: { [key: string]: any } = {};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useSettings();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const fetchTranslations = useCallback(async (lang: string) => {
    if (translationsCache[lang]) {
      setTranslations(translationsCache[lang]);
      return;
    }
    try {
      const response = await fetch(`./locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Could not load ${lang}.json`);
      }
      const data = await response.json();
      translationsCache[lang] = data;
      setTranslations(data);
    } catch (error) {
      console.error(error);
      // Fallback to English if the selected language file fails to load
      if (lang !== 'en') {
        await fetchTranslations('en');
      }
    }
  }, []);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  const t = (key: string, ...args: any[]): string => {
    let translation = translations[key] || key;
    // Simple replacement for placeholders like {0}, {1}
    if (args.length > 0) {
      args.forEach((arg, index) => {
        translation = translation.replace(`{${index}}`, arg);
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
