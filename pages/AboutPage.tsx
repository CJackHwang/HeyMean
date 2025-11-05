import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

const AboutPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

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

    const openLink = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="relative flex h-screen min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
            <header className="sticky top-0 z-10 flex items-center p-4 pb-3 justify-between shrink-0 border-b border-gray-200 dark:border-neutral-700 bg-background-light dark:bg-background-dark">
                <button onClick={handleBack} className="flex size-10 shrink-0 items-center justify-center">
                    <span className="material-symbols-outlined !text-2xl text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
                </button>
                <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('about.header_title')}</h2>
                <div className="w-10 shrink-0"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="w-full max-w-sm">
                    <img
                        src="https://avatars.githubusercontent.com/u/155826701"
                        alt="Developer Avatar"
                        className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-primary/20"
                    />
                    <h1 className="text-3xl font-bold">HeyMean</h1>
                    <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                        {t('about.app_description')}
                    </p>
                    <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-500">
                        {t('about.developed_by')}
                    </p>

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={() => openLink('https://github.com/CJackHwang/HeyMean')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-heymean-l dark:bg-heymean-d hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <span className="material-symbols-outlined">code</span>
                            <span>{t('about.github_repo')}</span>
                        </button>
                        <button
                            onClick={() => openLink('https://www.gnu.org/licenses/agpl-3.0.html')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-heymean-l dark:bg-heymean-d hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <span className="material-symbols-outlined">policy</span>
                            <span>{t('about.license')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;