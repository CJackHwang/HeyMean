
import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { getLatestConversation } from '../services/db';
import { useAttachments } from '../hooks/useAttachments';
import { AttachmentChip } from '../components/ChatInput';
import { useToast } from '../hooks/useToast';
import { handleError } from '../services/errorHandler';
import DebouncedButton from '../components/common/DebouncedButton';
import { useGuardedNavigate } from '../hooks/useGuardedNavigate';

const HomePage: React.FC = () => {
    const navigate = useGuardedNavigate();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [prompt, setPrompt] = useState('');
    const { 
        attachments, 
        fileInputRef, 
        handleFileChange, 
        removeAttachment, 
        triggerFileInput 
    } = useAttachments();

    const handleSend = () => {
        const hasText = !!prompt.trim();
        const hasAttachments = attachments.length > 0;
        if (hasText || hasAttachments) {
            // Do not revoke object URLs here.
            // The ChatPage component is responsible for handling their lifecycle.
            navigate('/chat', { state: { initialPrompt: prompt, initialAttachments: attachments, newChat: true } });
        } else {
            showToast(t('toast.input_required'), 'error');
        }
    };

    const handleContinue = async () => {
        try {
            const latestConversation = await getLatestConversation();
            if (latestConversation) {
                navigate('/chat', { state: { conversationId: latestConversation.id } });
            } else {
                navigate('/chat', { state: { newChat: true } });
            }
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
            // Fallback to a new chat if there's an error
            navigate('/chat', { state: { newChat: true } });
        }
    };

    return (
        <div className="relative flex h-screen min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
            <div className="flex flex-col flex-1 justify-center items-center p-4">
                <div className="w-full max-w-[480px] flex flex-col items-center gap-8">
                    <h1 className="text-5xl font-bold text-center whitespace-pre-line">{t('home.title')}</h1>
                    <div className="flex flex-col gap-4 w-full">
                        <div className="relative w-full">
                            <div className={`form-input flex w-full flex-col min-w-0 flex-1 bg-heymean-l dark:bg-heymean-d rounded-xl`}>
                                {attachments.length > 0 && (
                                    <div className="p-2 border-b border-gray-300 dark:border-gray-700/50">
                                        <div className="flex flex-wrap gap-2">
                                            {attachments.map((att, index) => (
                                                <AttachmentChip key={index} attachment={att} onRemove={() => removeAttachment(index)} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <textarea
                                    className="w-full resize-none overflow-hidden text-primary-text-light dark:text-primary-text-dark focus:outline-0 border-none bg-transparent min-h-36 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 p-4 pb-14 text-base font-normal leading-normal"
                                    placeholder={t('home.input_placeholder')}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                ></textarea>
                            </div>

                            <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                <input type="file" accept="image/*,application/pdf,text/plain,text/markdown,.md,.txt" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple/>
                                <button onClick={triggerFileInput} className="flex size-8 items-center justify-center rounded-lg bg-white dark:bg-neutral-700 text-primary-text-light dark:text-primary-text-dark">
                                    <span className="material-symbols-outlined text-base">attach_file</span>
                                </button>
                            </div>
                            <button onClick={handleSend} className="absolute bottom-4 right-4 text-primary-text-light dark:text-primary-text-dark">
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                        <div className="flex px-4 py-3 w-full gap-3">
                            <DebouncedButton
                                type="button"
                                onClick={handleContinue}
                                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark text-base font-bold leading-normal tracking-[0.015em]"
                            >
                                <span className="truncate">{t('home.button_continue')}</span>
                            </DebouncedButton>
                            <DebouncedButton
                                type="button"
                                onClick={() => navigate('/history')}
                                aria-label={t('history.header_title')}
                                className="flex items-center justify-center size-12 rounded-xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark shrink-0"
                            >
                                <span className="material-symbols-outlined !text-xl">history</span>
                            </DebouncedButton>
                            <DebouncedButton
                                type="button"
                                onClick={() => navigate('/settings')}
                                aria-label={t('settings.header_title')}
                                className="flex items-center justify-center size-12 rounded-xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark shrink-0"
                            >
                                <span className="material-symbols-outlined !text-xl">settings</span>
                            </DebouncedButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
