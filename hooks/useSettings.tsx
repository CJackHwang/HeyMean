import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Theme, ApiProvider, Language } from '../types';
import { getSetting, setSetting, initDB } from '../services/db';

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
  const [theme, setThemeState] = useState<Theme>(Theme.LIGHT);
  const [systemPrompt, setSystemPromptState] = useState<string>(''); // User's custom prompt
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState<string>(''); // Loaded from file
  const [selectedApiProvider, setSelectedApiProviderState] = useState<ApiProvider>(ApiProvider.GEMINI);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');
  const [openAiApiKey, setOpenAiApiKeyState] = useState<string>('');
  const [openAiModel, setOpenAiModelState] = useState<string>('');
  const [openAiBaseUrl, setOpenAiBaseUrlState] = useState<string>('');
  const [language, setLanguageState] = useState<Language>(Language.EN);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      await initDB();

      // Fetch the default prompt from prompt.txt
      let fetchedDefaultPrompt = 'You are a helpful and friendly AI learning assistant called HeyMean. Your goal is to explain complex topics in a simple and understandable way.'; // Fallback
      try {
        const response = await fetch('prompt.txt');
        if (response.ok) {
          fetchedDefaultPrompt = await response.text();
        } else {
          console.error("Failed to load default prompt.txt, using fallback.");
        }
      } catch (error) {
        console.error("Error fetching prompt.txt:", error, "using fallback.");
      }
      setDefaultSystemPrompt(fetchedDefaultPrompt.trim());

      const savedTheme = await getSetting<Theme>('theme') || Theme.LIGHT;
      const savedPrompt = await getSetting<string>('systemPrompt') || ''; // Default to empty
      const savedApiProvider = await getSetting<ApiProvider>('selectedApiProvider') || ApiProvider.GEMINI;
      const savedGeminiApiKey = await getSetting<string>('geminiApiKey') || '';
      const savedOpenAiApiKey = await getSetting<string>('openAiApiKey') || '';
      const savedOpenAiModel = await getSetting<string>('openAiModel') || 'gpt-4o'; // Default OpenAI model
      const savedOpenAiBaseUrl = await getSetting<string>('openAiBaseUrl') || 'https://api.openai.com/v1';
      const savedLanguage = await getSetting<Language>('language') || Language.EN;


      setThemeState(savedTheme);
      setSystemPromptState(savedPrompt);
      setSelectedApiProviderState(savedApiProvider);
      setGeminiApiKeyState(savedGeminiApiKey);
      setOpenAiApiKeyState(savedOpenAiApiKey);
      setOpenAiModelState(savedOpenAiModel);
      setOpenAiBaseUrlState(savedOpenAiBaseUrl);
      setLanguageState(savedLanguage);
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const root = window.document.documentElement;
    root.classList.remove(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
    root.classList.add(theme);
    setSetting('theme', theme);
  }, [theme, isLoading]);
  
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };
  
  const setSystemPrompt = (prompt: string) => {
    setSystemPromptState(prompt);
    setSetting('systemPrompt', prompt);
  };

  const setSelectedApiProvider = (provider: ApiProvider) => {
    setSelectedApiProviderState(provider);
    setSetting('selectedApiProvider', provider);
  };

  const setGeminiApiKey = (key: string) => {
    setGeminiApiKeyState(key);
    setSetting('geminiApiKey', key);
  };

  const setOpenAiApiKey = (key: string) => {
    setOpenAiApiKeyState(key);
    setSetting('openAiApiKey', key);
  };

  const setOpenAiModel = (model: string) => {
    setOpenAiModelState(model);
    setSetting('openAiModel', model);
  };

  const setOpenAiBaseUrl = (url: string) => {
    setOpenAiBaseUrlState(url);
    setSetting('openAiBaseUrl', url);
  };
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setSetting('language', lang);
  };

  const resetSettings = () => {
    setTheme(Theme.LIGHT);
    setSystemPrompt('');
    setSelectedApiProvider(ApiProvider.GEMINI);
    setGeminiApiKey('');
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
    openAiApiKey, 
    openAiModel, 
    openAiBaseUrl,
    language
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {!isLoading && children}
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
