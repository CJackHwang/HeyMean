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
    const isThinkingComplete = message.isThinkingComplete ?? true;
    const [expanded, setExpanded] = React.useState(!isThinkingComplete);
    const scrollRef = React.useRef<HTMLDivElement | null>(null);
    const previousCompletionState = React.useRef(isThinkingComplete);

    const thinkingContent = message.thinkingText?.trim() ?? '';
    const shouldRenderThinking = Boolean(message.isLoading || thinkingContent);
    const statusDetail = !isThinkingComplete
        ? t('message.thinking')
        : message.isLoading
            ? t('message.synthesizing')
            : null;

    React.useEffect(() => {
        if (previousCompletionState.current !== isThinkingComplete) {
            previousCompletionState.current = isThinkingComplete;
            setExpanded(!isThinkingComplete);
        }
    }, [isThinkingComplete]);

    React.useEffect(() => {
        if (!expanded) return;
        const container = scrollRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [thinkingContent, expanded]);

    const handleToggle = () => setExpanded(prev => !prev);

    const bodyContentClassName = shouldRenderThinking ? 'min-h-14' : undefined;

    return (
        <MarkdownSurface className="w-full ai-bubble">
            {shouldRenderThinking && (
                <div className="border-b border-gray-300/70 dark:border-white/20 bg-black/5 dark:bg-[color:var(--color-thinking-dark)] rounded-t-2xl">
                    <input
                        className="collapsible-checkbox"
                        id={uniqueId}
                        type="checkbox"
                        checked={expanded}
                        onChange={handleToggle}
                    />
                    <label className="flex items-center justify-between px-3 py-3 sm:px-4 cursor-pointer gap-3" htmlFor={uniqueId}>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                                {t('message.thinking_process')}
                            </span>
                            {statusDetail && (
                                <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 normal-case">
                                    {statusDetail}
                                </span>
                            )}
                        </div>
                        <span className="material-symbols-outlined collapsible-icon transition-transform transform text-neutral-500 dark:text-neutral-300">
                            expand_more
                        </span>
                    </label>
                    <div
                        ref={scrollRef}
                        className="px-3 pb-3 sm:px-4 collapsible-content space-y-2 max-h-64 overflow-y-auto custom-scrollbar text-sm leading-relaxed text-neutral-700 dark:text-neutral-300"
                    >
                        {thinkingContent ? (
                            <MarkdownRenderer content={thinkingContent} />
                        ) : (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">{t('message.thinking')}</p>
                        )}
                    </div>
                </div>
            )}
            <MarkdownSurface.Content content={message.text} className={bodyContentClassName} />
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
