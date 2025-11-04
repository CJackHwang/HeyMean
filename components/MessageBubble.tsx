import React, { useCallback } from 'react';
import { Message, MessageSender, Attachment } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import MarkdownRenderer from './MarkdownRenderer';
import MarkdownSurface from './MarkdownSurface';
import { getFileIcon, formatBytes } from '../utils/fileHelpers';
import { useLongPress } from '../hooks/useLongPress';

interface MessageBubbleProps {
  message: Message;
  onLongPress: (message: Message, position: { x: number; y: number }) => void;
}

const AttachmentItem: React.FC<{ attachment: Attachment }> = ({ attachment }) => {
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
        <div className="bg-primary text-white dark:bg-heymean-d rounded-2xl w-full p-3 flex flex-col gap-2 user-bubble">
            <div className="flex flex-col gap-2">
                {message.attachments.map((att, index) => (
                    <AttachmentItem key={index} attachment={att} />
                ))}
            </div>
            {message.text && (
                <p className="text-sm font-normal leading-normal pt-2 wrap-break-word">{message.text}</p>
            )}
        </div>
    );
}

const AiMessage: React.FC<{ message: Message }> = ({ message }) => {
    const { t } = useTranslation();
    const uniqueId = `thinking-toggle-${message.id}`;
    const hasThinkingProcess = message.thinkingText && message.thinkingText.length > 0;
    
    // The thinking wrapper is shown if the message is loading, OR if it has completed with thinking steps.
    const showThinkingWrapper = hasThinkingProcess; // Do not show based on loading

    return (
        <MarkdownSurface className="w-full ai-bubble">
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
                             ) : null}
                        </div>
                    </div>
                    <MarkdownSurface.Content content={message.text} className="min-h-14" />
                </>
            ) : (
                // This is a simple bubble for messages without any thinking process
                <MarkdownSurface.Content content={message.text} />
            )}
        </MarkdownSurface>
    );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onLongPress }) => {
  const { t } = useTranslation();
  const isUser = message.sender === MessageSender.USER;
  
  const handleLongPressCallback = useCallback((
    e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, 
    context: Message
  ) => {
    onLongPress(context, { x: e.clientX, y: e.clientY });
  }, [onLongPress]);

  const getLongPressHandlers = useLongPress<HTMLDivElement, Message>(handleLongPressCallback, undefined, { delay: 500 });

  if (isUser) {
    return (
        <div 
            className="flex w-full items-end gap-2.5 justify-end"
            data-message-bubble="true"
            {...getLongPressHandlers(message)}
        >
            <div className="flex flex-col gap-1.5 items-end max-w-[80%] md:max-w-md lg:max-w-lg xl:max-w-xl min-w-0">
                <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium leading-normal px-2">
                    {t('message.you')} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {(message.attachments && message.attachments.length > 0) ? (
                     <AttachmentDisplay message={message} />
                ) : (
                    <div className="text-sm font-normal leading-normal rounded-2xl px-4 py-3 bg-primary text-white dark:bg-heymean-d wrap-break-word user-bubble">
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
        data-message-bubble="true"
        {...getLongPressHandlers(message)}
    >
       <div className="flex flex-col gap-1.5 w-full min-w-0 max-w-[calc(100vw-48px)] sm:max-w-[calc(100vw-72px)] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl overflow-visible">
            <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium leading-normal px-2">HeyMean • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <AiMessage message={message} />
       </div>
    </div>
  )

};

export default React.memo(MessageBubble);
