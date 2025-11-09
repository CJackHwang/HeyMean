import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@app/providers/useTranslation';

const ChatHeader: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const handleBack = () => {
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <header className="flex items-center p-4 pb-3 justify-between border-b border-gray-200 dark:border-neutral-700 shrink-0">
            <button 
                onClick={handleBack} 
                aria-label={t('modal.cancel')} 
                className="flex size-10 shrink-0 items-center justify-center"
            >
                <span className="material-symbols-outlined text-2xl! text-primary-text-light dark:text-primary-text-dark">
                    arrow_back
                </span>
            </button>
            <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
                {t('chat.header_title')}
            </h2>
            <div className="flex w-10 items-center justify-end">
                <button 
                    onClick={() => navigate('/settings')} 
                    aria-label={t('settings.header_title')} 
                    className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-transparent text-primary-text-light dark:text-primary-text-dark gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0"
                >
                    <span className="material-symbols-outlined text-2xl!">more_vert</span>
                </button>
            </div>
        </header>
    );
};

export default ChatHeader;
