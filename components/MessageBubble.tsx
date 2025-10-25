import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Message, MessageSender } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface MessageBubbleProps {
  message: Message;
}

const AttachmentDisplay: React.FC<{ message: Message }> = ({ message }) => {
    const { t } = useTranslation();
    if (!message.attachment) return null;
    return (
        <div className="bg-primary text-white rounded-2xl w-full">
            <div className="p-3 border-b border-white/20">
                <div className="flex items-start gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                        <img alt={message.attachment.name} className="rounded-lg w-full h-full object-cover" src={message.attachment.preview} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{t('message.attachment')}</p>
                        <p className="text-xs text-white/70">{(message.attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                </div>
            </div>
            <p className="text-sm font-normal leading-normal px-4 py-3">{message.text}</p>
        </div>
    );
}

const AiMessage: React.FC<{ message: Message }> = ({ message }) => {
    const { t } = useTranslation();
    const uniqueId = `thinking-toggle-${message.id}`;
    const hasThinkingProcess = message.thinkingText && message.thinkingText.length > 0;
    
    // The thinking wrapper is shown if the message is loading, OR if it has completed with thinking steps.
    const showThinkingWrapper = message.isLoading || hasThinkingProcess;

    const markedOptions = { gfm: true, breaks: true };
    const rawMarkup = DOMPurify.sanitize(marked.parse(message.text, markedOptions) as string);
    const thinkingMarkup = DOMPurify.sanitize(marked.parse(message.thinkingText || '', markedOptions) as string);

    return (
        <div className="w-full rounded-2xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark">
            {showThinkingWrapper ? (
                // This is the complex bubble with a permanent thinking process section
                <>
                    <div className="border-b border-gray-300 dark:border-gray-700/50">
                        <input className="collapsible-checkbox" id={uniqueId} type="checkbox" defaultChecked={!message.isThinkingComplete} />
                        <label className="flex items-center justify-between p-3 cursor-pointer" htmlFor={uniqueId}>
                            <span className="text-xs font-semibold">{t('message.thinking_process')}</span>
                            <span className="material-symbols-outlined collapsible-icon transition-transform transform">expand_more</span>
                        </label>
                        <div className="px-3 pb-3 collapsible-content space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                             {hasThinkingProcess ? (
                                <div 
                                    className="prose prose-sm dark:prose-invert max-w-none" 
                                    dangerouslySetInnerHTML={{ __html: thinkingMarkup }} 
                                />
                             ) : (
                                // Show "Thinking..." placeholder when loading but no steps are available yet.
                                <div className="flex items-start gap-2 p-2.5 rounded-lg text-primary-text-light dark:text-primary-text-dark">
                                    <span className="material-symbols-outlined text-green-500 !text-base pt-0.5">psychology_alt</span>
                                    <div className="prose prose-sm dark:prose-invert max-w-none flex-1 min-w-0">{t('message.thinking')}</div>
                                    <div className="shrink-0 w-4 h-4 flex items-center justify-center mt-0.5">
                                        <div className="w-full h-full border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>
                    <div className="p-4 min-h-[3.5rem]">
                        <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: rawMarkup }} />
                        {message.isLoading && !message.text && hasThinkingProcess && (
                             <div className="flex items-center gap-2.5 text-sm">
                                <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
                                <span className="font-medium">{t('message.synthesizing')}</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                // This is a simple bubble for messages without any thinking process
                <div className="p-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: rawMarkup }} />
                </div>
            )}
        </div>
    );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { t } = useTranslation();
  const isUser = message.sender === MessageSender.USER;
  
  if (isUser) {
    return (
        <div className="flex w-full items-end gap-2.5 justify-end">
            <div className="flex flex-col gap-1.5 items-end max-w-[80%] xl:max-w-1/2">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-medium leading-normal px-2">
                    {t('message.you')} • {message.timestamp}
                </p>
                {message.attachment ? (
                     <AttachmentDisplay message={message} />
                ) : (
                    <p className="text-sm font-normal leading-normal flex rounded-2xl px-4 py-3 bg-primary text-white">
                        {message.text}
                    </p>
                )}
            </div>
        </div>
    );
  }

  // AI Message
  return (
    <div className="flex w-full items-start gap-2.5">
       <div className="flex flex-col gap-1.5 w-full xl:w-3/4">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium leading-normal px-2">HeyMean • {message.timestamp}</p>
            <AiMessage message={message} />
       </div>
    </div>
  )

};

export default MessageBubble;
