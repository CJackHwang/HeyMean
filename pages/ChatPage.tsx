import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Message, MessageSender, Attachment } from '../types';
import { useConversation } from '../hooks/useConversation';
import { getPayload, clearPayload } from '../utils/preloadPayload';
import { useChatStream } from '../hooks/useChatStream';
import { useMessageActions } from '../hooks/useMessageActions';
import { useTranslation } from '../hooks/useTranslation';
import { useToast } from '../hooks/useToast';
import { handleError } from '../services/errorHandler';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import { NotesView } from '../components/NotesView';
import ListItemMenu from '../components/ListItemMenu';
import Modal from '../components/Modal';
// Remove full-screen loading UI for seamless entry

const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const isInitialLoad = useRef(true);
    // Removed unused isInitialized state
    const { initialPrompt, initialAttachments, newChat, conversationId: stateConversationId } = location.state || {};
    const shouldForceScroll = useRef(false);
    const { showToast } = useToast();

    // --- CUSTOM HOOKS ---

    const {
        messages,
        setMessages,
        currentConversationId,
        loadConversation,
        startNewConversation,
        addMessageToConversation,
        saveUpdatedMessage,
        deleteMessageFromConversation,
        deleteMultipleMessagesFromConversation,
    } = useConversation(stateConversationId);

    const { isThinking, streamedAiMessage, streamResponse, cancel } = useChatStream();

    // --- EFFECT TO SYNC STREAMED MESSAGE ---

    useEffect(() => {
    if (streamedAiMessage) {
            const exists = messages.some(m => m.id === streamedAiMessage.id);
            if (exists) {
                setMessages(prev => prev.map(m => m.id === streamedAiMessage.id ? streamedAiMessage : m));
            } else {
                setMessages(prev => [...prev, streamedAiMessage]);
            }
            if (!streamedAiMessage.isLoading && !streamedAiMessage.isThinkingComplete) { // Stream has just begun
                // Placeholder added
            } else if (!streamedAiMessage.isLoading) { // Stream finished
                saveUpdatedMessage(streamedAiMessage);
            }
        }
    }, [streamedAiMessage, setMessages, saveUpdatedMessage]);

    // --- CORE CHAT LOGIC ---

    const handleSend = useCallback(async (text: string, attachments: Attachment[]) => {
        if (!text.trim() && attachments.length === 0) return;
        shouldForceScroll.current = true;

        let convId = currentConversationId;
        let chatHistory = messages;
        let userMessage: Message;

        if (!convId) { // New conversation
            const { userMessage: newUserMessage, conversationId: newConvId } = await startNewConversation(text, attachments);
            convId = newConvId;
            userMessage = newUserMessage;
            chatHistory = []; // History is empty for a new conversation
            navigate(location.pathname, { replace: true, state: { conversationId: newConvId } });
        } else { // Existing conversation
            userMessage = {
                id: Date.now().toString(),
                conversationId: convId,
                sender: MessageSender.USER,
                text,
                timestamp: new Date(),
                attachments,
                isLoading: false,
            };
            await addMessageToConversation(userMessage);
        }

        const aiMessageId = (Date.now() + 1).toString();
        await streamResponse(chatHistory, userMessage, aiMessageId);
    }, [currentConversationId, messages, navigate, location.pathname, startNewConversation, addMessageToConversation, streamResponse]);


    // --- INITIALIZATION EFFECT ---

    useEffect(() => {
        const loadAndInitialize = async () => {
            if (!isInitialLoad.current) return;
            isInitialLoad.current = false;

            if (!newChat && !stateConversationId) {
                navigate('/', { replace: true });
                return;
            }

            if (stateConversationId) {
                // Guard: if conversation already active and messages present, skip reload to avoid post-animation refresh
                if (currentConversationId === stateConversationId && messages.length > 0) {
                    shouldForceScroll.current = true;
                } else {
                    // Prefer preloaded payload hint; otherwise load
                    const preId = getPayload<string>('chat:conversationId');
                    clearPayload('chat:conversationId');
                    const id = preId || stateConversationId;
                    loadConversation(id).then(() => {
                        shouldForceScroll.current = true;
                    });
                }
            } else if (newChat) {
                // Render immediately
                setMessages([]);
                // Fire-and-forget initial prompt
                if (initialPrompt || (initialAttachments && initialAttachments.length > 0)) {
                    handleSend(initialPrompt || '', initialAttachments || []).catch(error => {
                        const appError = handleError(error, 'api');
                        showToast(appError.userMessage, 'error');
                    });
                }
                return;
            }
        };
        loadAndInitialize();
    }, [stateConversationId, newChat, initialPrompt, initialAttachments, navigate, handleSend, loadConversation, setMessages]);
    
    // --- MESSAGE ACTIONS (REGENERATE, RESEND, DELETE) ---

    const handleResend = useCallback(async (userMessageToResend: Message) => {
        shouldForceScroll.current = true;
        const messageIndex = messages.findIndex(m => m.id === userMessageToResend.id);
        if (messageIndex < 0) return;

        const subsequentMessages = messages.slice(messageIndex + 1);
        if (subsequentMessages.length > 0) {
            const idsToDelete = subsequentMessages.map(msg => msg.id);
            await deleteMultipleMessagesFromConversation(idsToDelete);
        }

        const chatHistory = messages.slice(0, messageIndex);

        const aiMessageId = (Date.now() + 1).toString();
        await streamResponse(chatHistory, userMessageToResend, aiMessageId);
    }, [messages, deleteMultipleMessagesFromConversation, streamResponse]);

    const handleRegenerate = useCallback(async (aiMessageToRegenerate: Message) => {
        shouldForceScroll.current = true;
        const messageIndex = messages.findIndex(m => m.id === aiMessageToRegenerate.id);
        if (messageIndex <= 0) return;
        const promptMessage = messages[messageIndex - 1];
        if (promptMessage.sender !== MessageSender.USER) return;

        const chatHistory = messages.slice(0, messageIndex - 1);
        await streamResponse(chatHistory, promptMessage, aiMessageToRegenerate.id);
    }, [messages, streamResponse]);

    const {
        menuState,
        deleteModalState,
        handleLongPress,
        confirmDeleteMessage,
        closeMenu,
        closeDeleteModal,
        menuActions,
    } = useMessageActions({
        resend: handleResend,
        regenerate: handleRegenerate,
        delete: deleteMessageFromConversation,
    });
    
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

    // --- UI & RENDER ---

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const isUserAtBottom = useRef(true);

    const rowVirtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => chatContainerRef.current,
        estimateSize: useCallback((index: number) => {
            const message = messages[index];
            if (!message) return 150;
            const baseSize = message.sender === MessageSender.USER ? 80 : 120;
            const textLines = message.text.split('\n').length;
            const attachmentSize = (message.attachments?.length || 0) * 70;
            let thinkingSize = 0;
            const hasThinking = message.isLoading || (!!message.thinkingText && message.thinkingText.length > 0);
            if (hasThinking) {
                if (message.isThinkingComplete) {
                    const thinkingLines = (message.thinkingText || '').split('\n').length;
                    thinkingSize = Math.min(300, 24 + thinkingLines * 16);
                } else {
                    thinkingSize = 80; // 未完成时固定占位，避免抖动
                }
            }
            return baseSize + (textLines * 18) + attachmentSize + thinkingSize;
        }, [messages]),
        overscan: 10,
    });

    // Effect to track if user is scrolled to the bottom
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const atBottom = scrollHeight - clientHeight <= scrollTop + 50;
            isUserAtBottom.current = atBottom;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Effect to scroll to bottom on new messages
    useLayoutEffect(() => {
        if (messages.length > 0) {
            if (shouldForceScroll.current || isUserAtBottom.current) {
                rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'auto' });
                if (shouldForceScroll.current) {
                    shouldForceScroll.current = false;
                }
            }
        }
    }, [messages.length, rowVirtualizer]);

    // Always render content; no blocking loaders

    return (
        <div className="relative flex h-screen min-h-screen w-full group/design-root overflow-hidden bg-background-light dark:bg-background-dark">
            <div className="flex-1 flex flex-col relative">
                <header className="flex items-center p-4 pb-3 justify-between border-b border-gray-200 dark:border-neutral-700 shrink-0">
                    <button onClick={handleBack} aria-label={t('modal.cancel')} className="flex size-10 shrink-0 items-center justify-center">
                        <span className="material-symbols-outlined text-2xl! text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
                    </button>
                    <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('chat.header_title')}</h2>
                    <div className="flex w-10 items-center justify-end">
                        <button onClick={() => navigate('/settings')} aria-label={t('settings.header_title')} className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-transparent text-primary-text-light dark:text-primary-text-dark gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                            <span className="material-symbols-outlined text-2xl!">more_vert</span>
                        </button>
                    </div>
                </header>

                <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                   {messages.length > 0 && (
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                                const message = messages[virtualItem.index];
                                if (!message) return null;

                                return (
                                    <div
                                        key={message.id}
                                        data-index={virtualItem.index}
                                        ref={(el) => {
                                            if (!el) return;
                                            rowVirtualizer.measureElement(el);
                                            const anyEl = el as HTMLElement & { __hm_ro?: ResizeObserver };
                                            if (!anyEl.__hm_ro) {
                                                anyEl.__hm_ro = new ResizeObserver(() => {
                                                    rowVirtualizer.measureElement(el);
                                                });
                                                anyEl.__hm_ro.observe(el);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualItem.start}px)`,
                                            paddingBottom: '24px',
                                        }}
                                    >
                                        <MessageBubble
                                            message={message}
                                            onLongPress={handleLongPress}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                <ListItemMenu isOpen={menuState.isOpen} onClose={closeMenu} position={menuState.position} actions={menuActions} />
                <Modal isOpen={deleteModalState.isOpen} onClose={closeDeleteModal} onConfirm={confirmDeleteMessage} title={t('modal.delete_message_title')} confirmText={t('modal.delete_confirm')} cancelText={t('modal.cancel')} confirmButtonClass="bg-red-600 hover:bg-red-700 text-white">
                    <p>{t('modal.delete_message_content')}</p>
                </Modal>

                <input className="sr-only" id="notes-drawer" type="checkbox" />
                <div>
                    <label className="xl:hidden flex items-center justify-between p-3 gap-2.5 bg-heymean-l dark:bg-heymean-d border-t border-b border-gray-200 dark:border-neutral-700 cursor-pointer" htmlFor="notes-drawer" id="notes-tab">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-xl! text-primary-text-light dark:text-primary-text-dark">description</span>
                            <span className="text-sm font-medium text-primary-text-light dark:text-primary-text-dark">{t('chat.notes_tab')}</span>
                        </div>
                        <span className="material-symbols-outlined text-xl! text-primary-text-light dark:text-primary-text-dark transform rotate-180">expand_less</span>
                    </label>
                    <footer className="p-3 bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-neutral-700">
                        <ChatInput onSend={handleSend} isThinking={isThinking} onStop={cancel} />
                    </footer>
                </div>
                <div className="xl:hidden fixed inset-0 bg-background-light dark:bg-background-dark flex flex-col opacity-0 pointer-events-none z-40" id="notes-content">
                    <NotesView />
                </div>
            </div>
            <div className="hidden xl:flex flex-col w-2/5 max-w-md border-l border-gray-200 dark:border-neutral-700 bg-background-light dark:bg-background-dark">
                <NotesView isDesktop={true} />
            </div>
        </div>
    );
};

export default ChatPage;
