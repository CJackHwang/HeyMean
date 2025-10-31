
import React, { useRef } from 'react';
import { Message, MessageSender, Attachment } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import MarkdownRenderer from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  onLongPress: (message: Message, position: { x: number; y: number }) => void;
}

const AttachmentItem: React.FC<{ attachment: Attachment }> = ({ attachment }) => {
    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'picture_as_pdf';
        if (mimeType === 'text/markdown') return 'article';
        if (mimeType.startsWith('text/')) return 'description';
        return 'attach_file';
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="bg-black/20 rounded-lg p-2 flex items-center gap-3">
            <div className="size-10 bg-black/20 rounded-md flex items-center justify-center shrink-0">
                {attachment.preview && attachment.type.startsWith('image/') ? (
                     <img src={attachment.preview} alt={attachment.name} className="w-full h-full object-cover rounded-md"/>
                ) : (
                    <span className="material-symbols-outlined text-neutral-400">{getFileIcon(attachment.type)}</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-sm text-white">{attachment.name}</p>
                <p className="text-xs text-neutral-400">{formatBytes(attachment.size)}</p>
            </div>
        </div>
    );
};


const AttachmentDisplay: React.FC<{ message: Message }> = ({ message }) => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
        <div className="bg-primary text-white dark:bg-heymean-d rounded-2xl w-full p-3 flex flex-col gap-2 transition-colors active:bg-neutral-900 dark:active:bg-white/20">
            <div className="flex flex-col gap-2">
                {message.attachments.map((att, index) => (
                    <AttachmentItem key={index} attachment={att} />
                ))}
            </div>
            {message.text && (
                <p className="text-sm font-normal leading-normal pt-2 break-words">{message.text}</p>
            )}
        </div>
    );
}

const AiMessage: React.FC<{ message: Message }> = ({ message }) => {
    const { t } = useTranslation();
    const uniqueId = `thinking-toggle-${message.id}`;
    const hasThinkingProcess = message.thinkingText && message.thinkingText.length > 0;
    
    // The thinking wrapper is shown if the message is loading, OR if it has completed with thinking steps.
    const showThinkingWrapper = message.isLoading || hasThinkingProcess;

    return (
        <div className="w-full rounded-2xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark overflow-hidden transition-colors active:bg-neutral-200 dark:active:bg-white/20">
            {showThinkingWrapper ? (
                // This is the complex bubble with a permanent thinking process section
                <>
                    <div className="border-b border-gray-300 dark:border-white/20">
                        <input className="collapsible-checkbox" id={uniqueId} type="checkbox" defaultChecked={!message.isThinkingComplete} />
                        <label className="flex items-center justify-between p-3 cursor-pointer" htmlFor={uniqueId}>
                            <span className="text-xs font-semibold">{t('message.thinking_process')}</span>
                            <span className="material-symbols-outlined collapsible-icon transition-transform transform">expand_more</span>
                        </label>
                        <div className="px-3 pb-3 collapsible-content space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                             {hasThinkingProcess ? (
                                <MarkdownRenderer content={message.thinkingText || ''} />
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
                        <MarkdownRenderer content={message.text} />
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
                    <MarkdownRenderer content={message.text} />
                </div>
            )}
        </div>
    );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onLongPress }) => {
  const { t } = useTranslation();
  const isUser = message.sender === MessageSender.USER;
  const longPressTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isLongPress = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only trigger for main button (left-click)
    if (e.button !== 0) return;
    isLongPress.current = false;
    longPressTimeout.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress(message, { x: e.clientX, y: e.clientY });
    }, 500);
  };

  const handlePointerUp = () => {
    clearTimeout(longPressTimeout.current);
  };

  const handlePointerLeave = () => {
    clearTimeout(longPressTimeout.current);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    clearTimeout(longPressTimeout.current);
    onLongPress(message, { x: e.clientX, y: e.clientY });
  };
  
  if (isUser) {
    return (
        <div 
            className="flex w-full items-end gap-2.5 justify-end"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onContextMenu={handleContextMenu}
        >
            <div className="flex flex-col gap-1.5 items-end max-w-[80%] md:max-w-md lg:max-w-lg xl:max-w-xl min-w-0">
                <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium leading-normal px-2">
                    {t('message.you')} • {message.timestamp}
                </p>
                {(message.attachments && message.attachments.length > 0) ? (
                     <AttachmentDisplay message={message} />
                ) : (
                    <div className="text-sm font-normal leading-normal rounded-2xl px-4 py-3 bg-primary text-white dark:bg-heymean-d break-words transition-colors active:bg-neutral-900 dark:active:bg-white/20">
                        {message.text.split('\n').map((line, index) => (
                          <React.Fragment key={index}>
                            {line}
                            {index < message.text.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
  }

  // AI Message
  return (
    <div 
        className="flex w-full items-start gap-2.5"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={handleContextMenu}
    >
       <div className="flex flex-col gap-1.5 w-full xl:w-3/4 min-w-0 overflow-hidden">
            <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium leading-normal px-2">HeyMean • {message.timestamp}</p>
            <AiMessage message={message} />
       </div>
    </div>
  )

};

export default React.memo(MessageBubble);