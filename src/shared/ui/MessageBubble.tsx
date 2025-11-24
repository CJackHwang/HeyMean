import React, { useCallback, useMemo } from 'react';
import { Message, MessageSender, Attachment } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';
import MarkdownRenderer from './MarkdownRenderer';
import MarkdownSurface from './MarkdownSurface';
import { getFileIcon, formatBytes } from '@shared/lib/fileHelpers';
import { useLongPress } from '@shared/hooks/useLongPress';

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

interface ToolCallPayload {
    name: string;
    status: 'success' | 'error';
    data: any;
}

const ToolCallDisplay: React.FC<{ payload: ToolCallPayload }> = ({ payload }) => {
    const [expanded, setExpanded] = React.useState(false);
    const isError = payload.status === 'error';
    
    return (
        <div className="my-2 select-none w-full max-w-full">
            <button 
                onClick={() => setExpanded(!expanded)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                    isError 
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/40' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/40'
                }`}
            >
                <span className={`material-symbols-outlined text-[16px] leading-none ${isError ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {isError ? 'error' : 'smart_toy'}
                </span>
                <span>
                   {isError ? 'Tool Error' : 'Used Tool'}: <span className="font-semibold">{payload.name}</span>
                </span>
                 <span className={`material-symbols-outlined text-[16px] leading-none ml-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>
            {expanded && (
                <div className="mt-2 mx-1 p-3 bg-gray-50 dark:bg-neutral-800/50 rounded-xl border border-gray-200 dark:border-neutral-700 text-xs font-mono overflow-x-auto shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                    <pre className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                        {typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

const AiMessage: React.FC<{ message: Message }> = ({ message }) => {
    const { t } = useTranslation();
    const isThinkingComplete = message.isThinkingComplete ?? true;
    const [expanded, setExpanded] = React.useState(!isThinkingComplete);
    const scrollRef = React.useRef<HTMLDivElement | null>(null);
    const previousCompletionState = React.useRef(isThinkingComplete);

    const thinkingContent = message.thinkingText?.trim() ?? '';
    const shouldRenderThinking = Boolean(message.isLoading || thinkingContent);

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

    // Parse message text for tool codes
    const messageParts = useMemo(() => {
        const text = message.text || '';
        const regex = /<tool_code>([\s\S]*?)<\/tool_code>/g;
        const result: Array<{ type: 'text' | 'tool', content: any }> = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Text before tool
            if (match.index > lastIndex) {
                const subText = text.substring(lastIndex, match.index);
                if (subText.trim()) {
                   result.push({ type: 'text', content: subText });
                } else if (match.index - lastIndex > 0) {
                   // Keep whitespace if needed, or maybe just trimming is safer for layout
                   // result.push({ type: 'text', content: subText });
                }
            }
            
            // Tool content
            try {
                const toolData = JSON.parse(match[1]);
                result.push({ type: 'tool', content: toolData });
            } catch (e) {
                result.push({ type: 'text', content: match[0] });
            }
            
            lastIndex = regex.lastIndex;
        }
        
        // Remaining text
        if (lastIndex < text.length) {
             result.push({ type: 'text', content: text.substring(lastIndex) });
        }
        
        return result;
    }, [message.text]);

    return (
        <MarkdownSurface className="w-full ai-bubble">
            {shouldRenderThinking && (
                <div className="px-4 pt-3 pb-1">
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={handleToggle}
                            className="flex items-center gap-2 w-fit text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer select-none"
                        >
                            {message.isLoading && !isThinkingComplete ? (
                                 <span className="relative flex h-2 w-2 mr-0.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
                                </span>
                            ) : (
                                <span className="material-symbols-outlined text-[16px] leading-none">
                                    thought_bubble
                                </span>
                            )}
                            <span>{isThinkingComplete ? t('message.thinking_process') : t('message.thinking')}</span>
                             <span className={`material-symbols-outlined text-[16px] leading-none transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        </button>
                        
                        {expanded && (
                             <div className="pl-3 border-l-2 border-gray-200 dark:border-neutral-700 ml-1 py-1">
                                <div
                                    ref={scrollRef}
                                    className="text-sm text-neutral-600 dark:text-neutral-400 markdown-thinking max-h-96 overflow-y-auto custom-scrollbar"
                                >
                                    {thinkingContent ? (
                                        <MarkdownRenderer content={thinkingContent} />
                                    ) : (
                                        <p className="italic opacity-70">{t('message.thinking')}</p>
                                    )}
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="p-4">
                {messageParts.length === 0 && !shouldRenderThinking && (
                    <span className="text-neutral-400 italic">Empty message</span>
                )}
                
                {messageParts.map((part, index) => (
                    <React.Fragment key={index}>
                        {part.type === 'tool' ? (
                            <ToolCallDisplay payload={part.content} />
                        ) : (
                            <MarkdownRenderer content={part.content} />
                        )}
                    </React.Fragment>
                ))}
            </div>
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
