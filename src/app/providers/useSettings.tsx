
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Theme, ApiProvider, Language } from '@shared/types';
import { getSetting, setSetting, initDB } from '@shared/services/db';
import { useToast } from './useToast';
import { handleError } from '@shared/services/errorHandler';

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemPrompt: string; // User-editable prompt
  setSystemPrompt: (prompt: string) => void;
  effectiveSystemPrompt: string; // The prompt to be used by the AI
  selectedApiProvider: ApiProvider;
  setSelectedApiProvider: (provider: ApiProvider) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiModel: string;
  setGeminiModel: (model: string) => void;
  openAiApiKey: string;
  setOpenAiApiKey: (key: string) => void;
  openAiModel: string;
  setOpenAiModel: (model: string) => void;
  openAiBaseUrl: string;
  setOpenAiBaseUrl: (url: string) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const ls = window.localStorage.getItem('hm_theme');
      if (ls === Theme.DARK || ls === Theme.LIGHT) return ls as Theme;
    } catch {}
    return Theme.LIGHT;
  });
  const [systemPrompt, setSystemPromptState] = useState<string>(''); // User's custom prompt
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState<string>(''); // Loaded from file
  const [selectedApiProvider, setSelectedApiProviderState] = useState<ApiProvider>(ApiProvider.GEMINI);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');
  const [geminiModel, setGeminiModelState] = useState<string>('gemini-2.5-flash');
  const [openAiApiKey, setOpenAiApiKeyState] = useState<string>('');
  const [openAiModel, setOpenAiModelState] = useState<string>('');
  const [openAiBaseUrl, setOpenAiBaseUrlState] = useState<string>('');
  const [language, setLanguageState] = useState<Language>(Language.EN);
  // Render immediately; theme flash is mitigated by early index.html script
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await initDB();

        // Fetch the default prompt from prompt.txt
        let fetchedDefaultPrompt = 'You are a helpful and friendly AI learning assistant called HeyMean. Your goal is to explain complex topics in a simple and understandable way.'; // Fallback
        try {
          const baseUrl = import.meta.env.BASE_URL || '/';
          const response = await fetch(`${baseUrl}prompt.txt`);
          if (response.ok) {
            fetchedDefaultPrompt = await response.text();
          } else {
            console.error("Failed to load default prompt.txt, using fallback.");
          }
        } catch (error) {
          console.error("Error fetching prompt.txt:", error, "using fallback.");
        }
        setDefaultSystemPrompt(fetchedDefaultPrompt.trim());

        // Prefer localStorage for earliest persisted theme, fallback to DB
        const lsTheme = (() => { try { return (localStorage.getItem('hm_theme') as Theme) || null; } catch { return null; } })();
        const savedDbTheme = await getSetting<Theme>('theme');
        const savedTheme = lsTheme || savedDbTheme || Theme.LIGHT;
        const savedPrompt = await getSetting<string>('systemPrompt') || ''; // Default to empty
        const savedApiProvider = await getSetting<ApiProvider>('selectedApiProvider') || ApiProvider.GEMINI;
        const savedGeminiApiKey = await getSetting<string>('geminiApiKey') || '';
        const savedGeminiModel = await getSetting<string>('geminiModel') || 'gemini-2.5-flash';
        const savedOpenAiApiKey = await getSetting<string>('openAiApiKey') || '';
        const savedOpenAiModel = await getSetting<string>('openAiModel') || 'gpt-4o'; // Default OpenAI model
        const savedOpenAiBaseUrl = await getSetting<string>('openAiBaseUrl') || 'https://api.openai.com/v1';
        const savedLanguage = await getSetting<Language>('language') || Language.EN;


        setThemeState(savedTheme);
        setSystemPromptState(savedPrompt);
        setSelectedApiProviderState(savedApiProvider);
        setGeminiApiKeyState(savedGeminiApiKey);
        setGeminiModelState(savedGeminiModel);
        setOpenAiApiKeyState(savedOpenAiApiKey);
        setOpenAiModelState(savedOpenAiModel);
        setOpenAiBaseUrlState(savedOpenAiBaseUrl);
        setLanguageState(savedLanguage);
      } catch (error) {
          const appError = handleError(error, 'db');
          showToast(appError.userMessage, 'error');
          // Keep default state on error
      } finally {
        setIsLoading(false);
        try {
          window.__hmSettingsReady = true;
          window.dispatchEvent(new Event('hm:settings-ready'));
        } catch {}
      }
    };
    loadSettings();
  }, [showToast]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
    root.classList.add(theme);

    const saveTheme = async () => {
      try {
        await setSetting('theme', theme);
        // Mirror to localStorage for earliest boot-time theme application
        try {
          window.localStorage.setItem('hm_theme', theme);
        } catch {}
      } catch (error) {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
      }
    };
    saveTheme();

    // Keep PWA/browser UI theme-color in sync with page background
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', theme === Theme.DARK ? '#111111' : '#FFFFFF');
      }
    } catch {}

  }, [theme, showToast]);
  
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Persist immediately to avoid race with loading flag
    try {
      window.localStorage.setItem('hm_theme', newTheme);
    } catch {}
    setSetting('theme', newTheme).catch(error => {
      const appError = handleError(error, 'settings');
      showToast(appError.userMessage, 'error');
    });
    try {
      const root = window.document.documentElement;
      root.classList.remove(newTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
      root.classList.add(newTheme);
    } catch {}
  };
  
  const setSystemPrompt = (prompt: string) => {
    setSystemPromptState(prompt);
    setSetting('systemPrompt', prompt).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };

  const setSelectedApiProvider = (provider: ApiProvider) => {
    setSelectedApiProviderState(provider);
    setSetting('selectedApiProvider', provider).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };

  const setGeminiApiKey = (key: string) => {
    setGeminiApiKeyState(key);
    setSetting('geminiApiKey', key).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };

  const setGeminiModel = (model: string) => {
    setGeminiModelState(model);
    setSetting('geminiModel', model).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };

  const setOpenAiApiKey = (key: string) => {
    setOpenAiApiKeyState(key);
    setSetting('openAiApiKey', key).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };

  const setOpenAiModel = (model: string) => {
    setOpenAiModelState(model);
    setSetting('openAiModel', model).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };

  const setOpenAiBaseUrl = (url: string) => {
    setOpenAiBaseUrlState(url);
    setSetting('openAiBaseUrl', url).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setSetting('language', lang).catch(error => {
        const appError = handleError(error, 'settings');
        showToast(appError.userMessage, 'error');
    });
  };

  const resetSettings = () => {
    // These setters already contain error handling
    setTheme(Theme.LIGHT);
    setSystemPrompt('');
    setSelectedApiProvider(ApiProvider.GEMINI);
    setGeminiApiKey('');
    setGeminiModel('gemini-2.5-flash');
    setOpenAiApiKey('');
    setOpenAiModel('gpt-4o');
    setOpenAiBaseUrl('https://api.openai.com/v1');
    setLanguage(Language.EN);
  };

  const effectiveSystemPrompt = useMemo(() => systemPrompt || defaultSystemPrompt, [systemPrompt, defaultSystemPrompt]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    systemPrompt, // The user-editable one
    setSystemPrompt,
    effectiveSystemPrompt, // The one for the API
    selectedApiProvider,
    setSelectedApiProvider,
    geminiApiKey,
    setGeminiApiKey,
    geminiModel,
    setGeminiModel,
    openAiApiKey,
    setOpenAiApiKey,
    openAiModel,
    setOpenAiModel,
    openAiBaseUrl,
    setOpenAiBaseUrl,
    language,
    setLanguage,
    resetSettings
  }), [
    theme, 
    systemPrompt,
    effectiveSystemPrompt,
    selectedApiProvider, 
    geminiApiKey, 
    geminiModel,
    openAiApiKey, 
    openAiModel, 
    openAiBaseUrl,
    language
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
