import React, { useCallback } from 'react';
import { Message, MessageSender, Attachment, ToolCall } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';
import MarkdownRenderer from './MarkdownRenderer';
import MarkdownSurface from './MarkdownSurface';
import { getFileIcon, formatBytes } from '@shared/lib/fileHelpers';
import { useLongPress } from '@shared/hooks/useLongPress';

interface MessageBubbleProps {
    message: Message;
    onLongPress: (message: Message, position: { x: number; y: number }) => void;
}

const AttachmentItem: React.FC<{ attachment: Attachment }> = React.memo(({ attachment }) => {
    return (
        <div className="bg-black/20 rounded-lg p-2 flex items-center gap-3">
            <div className="size-10 bg-black/20 rounded-md flex items-center justify-center shrink-0">
                {attachment.preview && attachment.type.startsWith('image/') ? (
                    <img src={attachment.preview} alt={attachment.name} className="w-full h-full object-cover rounded-md" />
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
});

AttachmentItem.displayName = 'AttachmentItem';

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

const ToolCallItem: React.FC<{ toolCall: ToolCall }> = React.memo(({ toolCall }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = React.useState(false);
    const uniqueId = `tool-${toolCall.id}`;

    const statusIcon = toolCall.status === 'calling' ? 'progress_activity' : toolCall.status === 'success' ? 'check_circle' : 'error';
    const statusColor = toolCall.status === 'calling' ? 'text-blue-500 dark:text-blue-400' : toolCall.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const statusText = toolCall.status === 'calling' ? t('message.tool_calling') : toolCall.status === 'success' ? t('message.tool_success') : t('message.tool_error');

    const toggleExpanded = React.useCallback(() => setExpanded(prev => !prev), []);

    return (
        <div className="bg-black/5 dark:bg-white/5 rounded-lg">
            <input
                className="collapsible-checkbox"
                id={uniqueId}
                type="checkbox"
                checked={expanded}
                onChange={toggleExpanded}
            />
            <label className="flex items-center justify-between px-3 py-2 cursor-pointer gap-3" htmlFor={uniqueId}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`material-symbols-outlined text-base ${statusColor}`}>{statusIcon}</span>
                    <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300 truncate">{toolCall.name}</span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{statusText}</span>
                </div>
                <span className="material-symbols-outlined collapsible-icon transition-transform transform text-sm text-neutral-500 dark:text-neutral-300">
                    expand_more
                </span>
            </label>
            <div className="px-3 pb-2 collapsible-content space-y-2 text-xs">
                {toolCall.parameters && Object.keys(toolCall.parameters).length > 0 && (
                    <div>
                        <div className="font-semibold text-neutral-600 dark:text-neutral-400 mb-1 text-[10px] uppercase tracking-wide">{t('message.tool_parameters')}</div>
                        <pre className="bg-black/10 dark:bg-white/10 rounded p-2 overflow-x-auto text-[11px] text-neutral-700 dark:text-neutral-300">
                            {JSON.stringify(toolCall.parameters, null, 2)}
                        </pre>
                    </div>
                )}
                {toolCall.result && (
                    <div>
                        <div className="font-semibold text-neutral-600 dark:text-neutral-400 mb-1 text-[10px] uppercase tracking-wide">{t('message.tool_result')}</div>
                        {toolCall.result.error ? (
                            <div className="text-red-600 dark:text-red-400 text-xs">{toolCall.result.error}</div>
                        ) : (
                            <pre className="bg-black/10 dark:bg-white/10 rounded p-2 overflow-x-auto text-[11px] text-neutral-700 dark:text-neutral-300">
                                {JSON.stringify(toolCall.result.data, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

ToolCallItem.displayName = 'ToolCallItem';

const AiMessage: React.FC<{ message: Message }> = ({ message }) => {
    const { t } = useTranslation();
    const uniqueId = `thinking-toggle-${message.id}`;
    const isThinkingComplete = message.isThinkingComplete ?? true;
    const [expanded, setExpanded] = React.useState(!isThinkingComplete);
    const scrollRef = React.useRef<HTMLDivElement | null>(null);
    const previousCompletionState = React.useRef(isThinkingComplete);

    const thinkingContent = message.thinkingText?.trim() ?? '';
    const shouldRenderThinking = Boolean(message.isLoading || thinkingContent);
    const hasToolCalls = Boolean(message.toolCalls && message.toolCalls.length > 0);
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

    const bodyContentClassName = shouldRenderThinking || hasToolCalls ? 'min-h-14' : undefined;

    return (
        <div className="flex flex-col gap-2.5">
            <MarkdownSurface className="w-full ai-bubble">
                {shouldRenderThinking && (
                    <div className="border-b border-gray-300/70 dark:border-white/20 bg-gradient-to-br from-blue-50/60 via-purple-50/50 to-pink-50/40 dark:from-thinking-dark dark:via-thinking-dark/95 dark:to-thinking-dark/90 rounded-t-2xl overflow-hidden">
                        <input
                            className="collapsible-checkbox"
                            id={uniqueId}
                            type="checkbox"
                            checked={expanded}
                            onChange={handleToggle}
                        />
                        <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" htmlFor={uniqueId}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center size-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-400/30 dark:to-purple-400/30">
                                    <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-300">psychology</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
                                        {t('message.thinking_process')}
                                    </span>
                                    {statusDetail && (
                                        <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 normal-case">
                                            {statusDetail}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="material-symbols-outlined collapsible-icon transition-transform transform text-neutral-600 dark:text-neutral-300">
                                expand_more
                            </span>
                        </label>
                        <div
                            ref={scrollRef}
                            className="px-4 pb-4 collapsible-content space-y-2 max-h-64 overflow-y-auto custom-scrollbar text-sm leading-relaxed text-neutral-700 dark:text-neutral-300"
                        >
                            {thinkingContent ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <MarkdownRenderer content={thinkingContent} />
                                </div>
                            ) : (
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 animate-pulse">{t('message.thinking')}</p>
                            )}
                        </div>
                    </div>
                )}
                <MarkdownSurface.Content content={message.text} className={bodyContentClassName} />
            </MarkdownSurface>
            {hasToolCalls && (
                <div className="bg-heymean-l dark:bg-heymean-d rounded-2xl border border-black/5 dark:border-white/10 p-3.5 space-y-2.5 shadow-sm">
                    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-200">
                        <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:from-amber-400/30 dark:to-orange-400/30">
                            <span className="material-symbols-outlined text-base text-amber-700 dark:text-amber-300">build_circle</span>
                        </div>
                        {t('message.tool_calls')}
                    </div>
                    <div className="space-y-2">
                        {message.toolCalls?.map((toolCall) => (
                            <ToolCallItem key={toolCall.id} toolCall={toolCall} />
                        ))}
                    </div>
                </div>
            )}
        </div>
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
            <div className="flex flex-col gap-1.5 w-full min-w-0 max-w-full lg:max-w-2xl xl:max-w-3xl overflow-visible">
                <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium leading-normal px-2">HeyMean • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <AiMessage message={message} />
            </div>
        </div>
    )

};

export default React.memo(MessageBubble);
