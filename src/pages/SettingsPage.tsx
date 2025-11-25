import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '@app/providers/useSettings';
import { useTranslation } from '@app/providers/useTranslation';
import { Theme, ApiProvider, Language } from '@shared/types';
import Modal from '@shared/ui/Modal';
import { clearAllData } from '@shared/services/db';
import Selector from '@shared/ui/Selector';
import { useToast } from '@app/providers/useToast';
import { handleError } from '@shared/services/errorHandler';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { 
    theme, 
    setTheme, 
    systemPrompt, 
    setSystemPrompt, 
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
        throw new Error(errorData?.error?.message || `API error (${response.status})`);
      }
      const data = await response.json() as { data: Array<{ id: string }> };
      const modelIds = data.data.map((model) => model.id).sort();
      setAvailableModels(modelIds);
      // If current model is not in the list, set to the first one available
      if (modelIds.length > 0 && !modelIds.includes(openAiModel)) {
          setOpenAiModel(modelIds[0]);
      }
    } catch (error) {
      const appError = handleError(error, 'api');
      setFetchError(appError.userMessage);
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
      showToast(t('modal.clear_data_success'), 'success');
      navigate('/', { replace: true });
    } catch (error) {
      const appError = handleError(error, 'db');
      showToast(appError.userMessage, 'error');
      setIsClearDataModalOpen(false);
    }
  };

  useEffect(() => {
    // Reset model list if credentials change, prompting user to re-fetch
    setAvailableModels([]);
    setFetchError(null);
  }, [openAiApiKey, openAiBaseUrl]);

  const handleBack = () => {
    // The initial location in the history stack has the key "default".
    // If we are not on the initial location, we can safely go back.
    if (location.key !== 'default') {
        navigate(-1);
    } else {
        // Otherwise, navigate to the home page as a fallback.
        navigate('/');
    }
  };


  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
      <header className="sticky top-0 z-10 flex items-center p-4 pb-3 justify-between shrink-0 border-b border-gray-200 dark:border-neutral-700 bg-background-light dark:bg-background-dark">
        <button onClick={handleBack} className="flex size-10 shrink-0 items-center justify-center">
          <span className="material-symbols-outlined text-2xl! text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
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
                <div className="flex items-center bg-background-light dark:bg-background-dark rounded-full p-1 gap-1">
                  <button 
                    onClick={() => setTheme(Theme.LIGHT)} 
                    className={`size-9 flex items-center justify-center rounded-full transition-colors ${theme === Theme.LIGHT ? 'bg-primary text-white' : 'text-primary-text-light/60 dark:text-primary-text-dark/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title={t('settings.theme_light')}
                  >
                    <span className="material-symbols-outlined text-xl">light_mode</span>
                  </button>
                  <button 
                    onClick={() => setTheme(Theme.DARK)} 
                    className={`size-9 flex items-center justify-center rounded-full transition-colors ${theme === Theme.DARK ? 'bg-primary dark:bg-white text-white dark:text-black' : 'text-primary-text-light/60 dark:text-primary-text-dark/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title={t('settings.theme_dark')}
                  >
                    <span className="material-symbols-outlined text-xl">dark_mode</span>
                  </button>
                  <button 
                    onClick={() => setTheme(Theme.SYSTEM)} 
                    className={`size-9 flex items-center justify-center rounded-full transition-colors ${theme === Theme.SYSTEM ? 'bg-primary dark:bg-white text-white dark:text-black' : 'text-primary-text-light/60 dark:text-primary-text-dark/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    title={t('settings.theme_system')}
                  >
                    <span className="material-symbols-outlined text-xl">computer</span>
                  </button>
                </div>
              </div>
            </div>
            <Selector
              label={t('settings.appearance_language')}
              icon="language"
              options={[
                { value: Language.EN, label: 'English' },
                { value: Language.ZH_CN, label: '简体中文' },
                { value: Language.JA, label: '日本語' },
              ]}
              selectedValue={language}
              onSelect={(lang) => setLanguage(lang as Language)}
            />
          </div>
        </section>

        <section>
            <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_model')}</h2>
            <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-4 space-y-4">
                 <div>
                    <label htmlFor="system-prompt" className="block text-sm font-medium mb-2 px-2">{t('settings.model_system_prompt')}</label>
                    <textarea
                        id="system-prompt"
                        rows={4}
                        className="w-full p-3 rounded-lg bg-background-light dark:bg-background-dark focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-white resize-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder={t('settings.model_system_prompt_placeholder')}
                    />
                </div>
            </div>
        </section>

        <section>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_api')}</h2>
          <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-2 space-y-1">
            <Selector
              label={t('settings.api_provider')}
              icon="hub"
              options={[
                { value: ApiProvider.GEMINI, label: t('settings.api_provider_gemini') },
                { value: ApiProvider.OPENAI, label: t('settings.api_provider_openai') }
              ]}
              selectedValue={selectedApiProvider}
              onSelect={(provider) => setSelectedApiProvider(provider as ApiProvider)}
            />

            {selectedApiProvider === ApiProvider.GEMINI && (
              <>
                <div className="p-4 space-y-4">
                  <div>
                    <label htmlFor="gemini-api-key" className="block text-sm font-medium mb-2">{t('settings.api_key')}</label>
                    <input
                      id="gemini-api-key"
                      type="password"
                      placeholder={t('settings.api_key_gemini_placeholder')}
                      className="w-full p-3 rounded-lg bg-background-light dark:bg-background-dark focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-white"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('settings.api_key_gemini_info')}</p>
                  </div>
                </div>
                <Selector
                  label={t('settings.api_model_name')}
                  icon="memory"
                  options={[
                    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast, Default)' },
                    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Powerful)' }
                  ]}
                  selectedValue={geminiModel}
                  onSelect={setGeminiModel}
                />
                <p className="text-xs text-gray-500 mt-1 px-4 pb-2">{t('settings.api_model_gemini_info')}</p>
              </>
            )}

            {selectedApiProvider === ApiProvider.OPENAI && (
              <div className="p-4 space-y-4">
                <div>
                  <label htmlFor="openai-api-key" className="block text-sm font-medium mb-2">{t('settings.api_key')}</label>
                  <input
                    id="openai-api-key"
                    type="password"
                    placeholder={t('settings.api_key_openai_placeholder')}
                    className="w-full p-3 rounded-lg bg-background-light dark:bg-background-dark focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-white"
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
                    className="w-full p-3 rounded-lg bg-background-light dark:bg-background-dark focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-white"
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
                      <Selector
                        label={t('settings.api_model_name')}
                        options={availableModels.map(id => ({ value: id, label: id }))}
                        selectedValue={openAiModel}
                        onSelect={setOpenAiModel}
                      />
                    ) : (
                      <input
                        id="openai-model"
                        type="text"
                        placeholder={t('settings.api_model_placeholder')}
                        className="w-full p-3 rounded-lg bg-background-light dark:bg-background-dark focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-white"
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
              </div>
            )}
          </div>
        </section>

        {/* --- Informational Sections --- */}
        <section>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_about')}</h2>
           <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-2 space-y-1">
            <div onClick={() => navigate('/about')} className="flex items-center gap-4 px-4 min-h-14 justify-between rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center justify-center rounded-lg bg-heymean-l dark:bg-heymean-d shrink-0 size-10">
                        <span className="material-symbols-outlined">info</span>
                    </div>
                    <p className="text-base font-normal leading-normal flex-1 truncate">{t('settings.about_app')}</p>
                </div>
                 <span className="material-symbols-outlined text-neutral-400 dark:text-neutral-500">chevron_right</span>
            </div>
          </div>
        </section>
        
        {/* --- Destructive Actions - Placed at the very bottom for safety --- */}
        <section>
          <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">{t('settings.section_account')}</h2>
           <div className="bg-heymean-l/50 dark:bg-heymean-d/50 rounded-xl p-2 space-y-1">
            <div onClick={() => setIsClearDataModalOpen(true)} className="flex items-center gap-4 px-4 min-h-14 justify-between rounded-lg cursor-pointer hover:bg-red-500/10">
                <p className="text-red-500 text-base font-normal leading-normal flex-1 truncate">{t('settings.account_clear_data')}</p>
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
