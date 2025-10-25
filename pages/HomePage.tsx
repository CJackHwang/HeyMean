
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Attachment } from '../types';
import { useTranslation } from '../hooks/useTranslation';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [attachment, setAttachment] = useState<Attachment | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (prompt.trim() || attachment) {
            navigate('/chat', { state: { initialPrompt: prompt, initialAttachment: attachment, newChat: true } });
        }
    };

    const handleContinue = () => {
        // This will just start a new chat, but could be extended to load from localStorage
        navigate('/chat');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const preview = URL.createObjectURL(file);
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                setAttachment({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: reader.result as string,
                    preview: preview,
                });
            };
        }
    };
    
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="relative flex h-screen min-h-screen w-full flex-col group/design-root overflow-x-hidden bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
            <div className="flex flex-col flex-1 justify-center items-center p-4">
                <div className="w-full max-w-[480px] flex flex-col items-center gap-8">
                    <h1 className="text-5xl font-bold text-center whitespace-pre-line">{t('home.title')}</h1>
                    <div className="flex flex-col gap-4 w-full">
                        <div className="relative w-full">
                            <textarea
                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-primary-text-light dark:text-primary-text-dark focus:outline-0 focus:ring-2 focus:ring-primary dark:focus:ring-white border-none bg-heymean-l dark:bg-heymean-d min-h-36 placeholder:text-gray-500 dark:placeholder:text-gray-400 p-4 pb-14 text-base font-normal leading-normal"
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
                            {attachment && (
                                <div className="absolute top-2 right-2 p-1 bg-black/20 rounded">
                                    <img src={attachment.preview} alt="preview" className="h-10 w-10 object-cover rounded"/>
                                </div>
                            )}
                            <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                <button onClick={triggerFileInput} className="flex size-8 items-center justify-center rounded-lg bg-white dark:bg-gray-700 text-primary-text-light dark:text-primary-text-dark">
                                    <span className="material-symbols-outlined text-base">attach_file</span>
                                </button>
                            </div>
                            <button onClick={handleSend} className="absolute bottom-4 right-4 text-primary-text-light dark:text-primary-text-dark">
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </div>
                        <div className="flex px-4 py-3 w-full">
                            <button onClick={handleContinue} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark text-base font-bold leading-normal tracking-[0.015em]">
                                <span className="truncate">{t('home.button_continue')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
