import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import { Theme, ApiProvider, Language } from '../types';
import Modal from '../components/Modal';
import { clearAllData } from '../services/db';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    theme, 
    setTheme, 
    systemPrompt, 
    setSystemPrompt, 
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
  } = useSettings();

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);


  const handleFetchModels = async () => {
    if (!openAiApiKey) {
      setFetchError(t('settings.api_key_error'));
      return;
    }
    setIsFetchingModels(true);
    setFetchError(null);
    setAvailableModels([]);
    try {
      const response = await fetch(`${openAiBaseUrl || 'https://api.openai.com/v1'}/models`, {
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const modelIds = data.data.map((model: any) => model.id).sort();
      setAvailableModels(modelIds);
      // If current model is not in the list, set to the first one available
      if (modelIds.length > 0 && !modelIds.includes(openAiModel)) {
          setOpenAiModel(modelIds[0]);
      }
    } catch (error: any) {
      setFetchError(error.message || "Failed to fetch models.");
      console.error("Failed to fetch models:", error);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleConfirmClearData = async () => {
    try {
      await clearAllData();
      // Reset the application's in-memory state to defaults
      resetSettings();
      // Use the router's navigate function to safely return to the home page.
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Failed to clear data:", error);
      alert(t('modal.clear_data_error'));
      setIsClearDataModalOpen(false);
    }
  };

  useEffect(() => {
    // Reset model list if credentials change, prompting user to re-fetch
    setAvailableModels([]);
    setFetchError(null);
  }, [openAiApiKey, openAiBaseUrl]);


  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
      <header className="sticky top-0 z-10 flex items-center p-4 pb-3 justify-between shrink-0 border-b border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark">
        <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center">
          <span className="material-symbols-outlined !text-2xl text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
        </button>
        <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('settings.header_title')}</h2>
        <div className="w-10 shrink-0"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        <section>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_appearance')}</h2>
          <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-2 space-y-1">
            <div className="flex items-center gap-4 px-4 min-h-14 justify-between rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-lg bg-heymean-l dark:bg-heymean-d shrink-0 size-10">
                  <span className="material-symbols-outlined">contrast</span>
                </div>
                <p className="text-base font-normal leading-normal flex-1 truncate">{t('settings.appearance_theme')}</p>
              </div>
              <div className="shrink-0">
                <div className="flex items-center bg-background-light dark:bg-background-dark rounded-full p-1 text-sm font-medium">
                  <button onClick={() => setTheme(Theme.LIGHT)} className={`px-4 py-1.5 rounded-full ${theme === Theme.LIGHT ? 'bg-primary text-white' : 'text-primary-text-light/60 dark:text-primary-text-dark/60'}`}>{t('settings.theme_light')}</button>
                  <button onClick={() => setTheme(Theme.DARK)} className={`px-4 py-1.5 rounded-full ${theme === Theme.DARK ? 'bg-primary dark:bg-white dark:text-black' : 'text-primary-text-light/60 dark:text-primary-text-dark/60'}`}>{t('settings.theme_dark')}</button>
                </div>
              </div>
            </div>
             <div className="flex items-center gap-4 px-4 min-h-14 justify-between rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center rounded-lg bg-heymean-l dark:bg-heymean-d shrink-0 size-10">
                    <span className="material-symbols-outlined">language</span>
                    </div>
                    <p className="text-base font-normal leading-normal flex-1 truncate">{t('settings.appearance_language')}</p>
                </div>
                <div className="shrink-0">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                    >
                        <option value={Language.EN}>English</option>
                        <option value={Language.ZH_CN}>简体中文</option>
                        <option value={Language.JA}>日本語</option>
                    </select>
                </div>
            </div>
          </div>
        </section>

        <section>
            <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_model')}</h2>
            <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-4 space-y-4">
                 <div>
                    <label htmlFor="system-prompt" className="block text-sm font-medium mb-2">{t('settings.model_system_prompt')}</label>
                    <textarea
                        id="system-prompt"
                        rows={4}
                        className="w-full p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white resize-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder={t('settings.model_system_prompt_placeholder')}
                    />
                </div>
            </div>
        </section>

        <section>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_api')}</h2>
          <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-4 space-y-4">
            <div>
              <label htmlFor="api-provider" className="block text-sm font-medium mb-2">{t('settings.api_provider')}</label>
              <select
                id="api-provider"
                className="w-full p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                value={selectedApiProvider}
                onChange={(e) => setSelectedApiProvider(e.target.value as ApiProvider)}
              >
                <option value={ApiProvider.GEMINI}>{t('settings.api_provider_gemini')}</option>
                <option value={ApiProvider.OPENAI}>{t('settings.api_provider_openai')}</option>
              </select>
            </div>

            {selectedApiProvider === ApiProvider.GEMINI && (
              <div>
                <label htmlFor="gemini-api-key" className="block text-sm font-medium mb-2">{t('settings.api_key')}</label>
                <input
                  id="gemini-api-key"
                  type="password"
                  placeholder={t('settings.api_key_gemini_placeholder')}
                  className="w-full p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">{t('settings.api_key_gemini_info')}</p>
              </div>
            )}

            {selectedApiProvider === ApiProvider.OPENAI && (
              <>
                <div>
                  <label htmlFor="openai-api-key" className="block text-sm font-medium mb-2">{t('settings.api_key')}</label>
                  <input
                    id="openai-api-key"
                    type="password"
                    placeholder={t('settings.api_key_openai_placeholder')}
                    className="w-full p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                    value={openAiApiKey}
                    onChange={(e) => setOpenAiApiKey(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('settings.api_key_openai_info')}</p>
                </div>
                <div>
                  <label htmlFor="openai-base-url" className="block text-sm font-medium mb-2">{t('settings.api_base_url')}</label>
                  <input
                    id="openai-base-url"
                    type="text"
                    placeholder={t('settings.api_base_url_placeholder')}
                    className="w-full p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                    value={openAiBaseUrl}
                    onChange={(e) => setOpenAiBaseUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('settings.api_base_url_info')}</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                      <label htmlFor="openai-model" className="block text-sm font-medium">{t('settings.api_model_name')}</label>
                      <button 
                        onClick={handleFetchModels}
                        disabled={isFetchingModels || !openAiApiKey}
                        className="text-sm font-medium text-primary dark:text-white hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFetchingModels ? t('settings.api_fetching_models') : t('settings.api_fetch_models')}
                      </button>
                  </div>
                  {availableModels.length > 0 ? (
                      <select
                        id="openai-model"
                        className="w-full p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                        value={openAiModel}
                        onChange={(e) => setOpenAiModel(e.target.value)}
                      >
                        {availableModels.map(modelId => (
                          <option key={modelId} value={modelId}>{modelId}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="openai-model"
                        type="text"
                        placeholder={t('settings.api_model_placeholder')}
                        className="w-full p-2 rounded-lg bg-background-light dark:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                        value={openAiModel}
                        onChange={(e) => setOpenAiModel(e.target.value)}
                      />
                  )}
                  {fetchError && <p className="text-xs text-red-500 mt-1">{fetchError}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                      {availableModels.length > 0 
                      ? t('settings.api_model_select_info')
                      : t('settings.api_model_fetch_info')}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_account')}</h2>
           <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-2 space-y-1">
            <div onClick={() => setIsClearDataModalOpen(true)} className="flex items-center gap-4 px-4 min-h-14 justify-between rounded-lg cursor-pointer hover:bg-red-500/10">
                <p className="text-red-500 text-base font-normal leading-normal flex-1 truncate">{t('settings.account_clear_data')}</p>
            </div>
            <div className="flex items-center gap-4 px-4 min-h-14 justify-between rounded-lg">
              <p className="text-red-500 text-base font-normal leading-normal flex-1 truncate cursor-pointer">{t('settings.account_delete')}</p>
            </div>
          </div>
        </section>
      </div>

      <Modal
          isOpen={isClearDataModalOpen}
          onClose={() => setIsClearDataModalOpen(false)}
          onConfirm={handleConfirmClearData}
          title={t('modal.clear_data_title')}
          confirmText={t('modal.clear_data_confirm')}
          cancelText={t('modal.cancel')}
          confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      >
          <p>{t('modal.clear_data_content')}</p>
      </Modal>

    </div>
  );
};

export default SettingsPage;