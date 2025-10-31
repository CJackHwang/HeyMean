
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Message, MessageSender, Attachment } from '../types';
import { useConversation } from '../hooks/useConversation';
import { useChatStream } from '../hooks/useChatStream';
import { useMessageActions } from '../hooks/useMessageActions';
import { useTranslation } from '../hooks/useTranslation';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import { NotesView } from '../components/NotesView';
import ListItemMenu from '../components/ListItemMenu';
import Modal from '../components/Modal';

const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const isInitialLoad = useRef(true);
    const { initialPrompt, initialAttachments, newChat, conversationId: stateConversationId } = location.state || {};
    const shouldForceScroll = useRef(false);

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
    } = useConversation(stateConversationId);

    const { isThinking, streamedAiMessage, streamResponse } = useChatStream();

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
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
                await loadConversation(stateConversationId);
            } else if (newChat) {
                setMessages([]);
                if (initialPrompt || (initialAttachments && initialAttachments.length > 0)) {
                    await handleSend(initialPrompt || '', initialAttachments || []);
                }
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
        for (const msg of subsequentMessages) await deleteMessageFromConversation(msg.id);

        const chatHistory = messages.slice(0, messageIndex);
        setMessages(prev => prev.slice(0, messageIndex + 1));

        const aiMessageId = (Date.now() + 1).toString();
        await streamResponse(chatHistory, userMessageToResend, aiMessageId);
    }, [messages, deleteMessageFromConversation, setMessages, streamResponse]);

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

    // --- UI & RENDER ---

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const scrollInfo = useRef({ scrollTop: 0, scrollHeight: 0 });

    useLayoutEffect(() => {
        const container = chatContainerRef.current;
        if (container) {
            // Before the browser paints, capture the current scroll values.
            // At this point, new messages are in the DOM, so scrollHeight is updated,
            // but the browser hasn't adjusted the scroll position yet.
            scrollInfo.current = {
                scrollTop: container.scrollTop,
                scrollHeight: container.scrollHeight,
            };
        }
    }); // No dependency array, runs on every render

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const { scrollTop: prevScrollTop, scrollHeight: prevScrollHeight } = scrollInfo.current;
        
        // The user is considered "at the bottom" if they were within a threshold
        // before the new content was added.
        // We compare the previous scroll position with the previous scroll height.
        const wasAtBottom = prevScrollHeight - container.clientHeight <= prevScrollTop + 50; // A small threshold for tolerance

        // Force scroll if the user initiated an action (send, resend, etc.),
        // or if they were already at the bottom when new content arrived.
        if (shouldForceScroll.current || wasAtBottom) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            if(shouldForceScroll.current) {
                shouldForceScroll.current = false; // Reset the flag after use
            }
        }
    }, [messages]); // This effect specifically handles scrolling when messages change.


    return (
        <div className="relative flex h-screen min-h-screen w-full group/design-root overflow-hidden bg-background-light dark:bg-background-dark">
            <div className="flex-1 flex flex-col relative">
                <header className="flex items-center p-4 pb-3 justify-between border-b border-gray-200 dark:border-neutral-700 shrink-0">
                    <button onClick={() => navigate('/')} className="flex size-10 shrink-0 items-center justify-center">
                        <span className="material-symbols-outlined !text-2xl text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
                    </button>
                    <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('chat.header_title')}</h2>
                    <div className="flex w-10 items-center justify-end">
                        <button onClick={() => navigate('/settings')} className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 bg-transparent text-primary-text-light dark:text-primary-text-dark gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0">
                            <span className="material-symbols-outlined !text-2xl">more_vert</span>
                        </button>
                    </div>
                </header>

                <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} onLongPress={handleLongPress} />
                    ))}
                </main>

                <ListItemMenu isOpen={menuState.isOpen} onClose={closeMenu} position={menuState.position} actions={menuActions} />
                <Modal isOpen={deleteModalState.isOpen} onClose={closeDeleteModal} onConfirm={confirmDeleteMessage} title={t('modal.delete_message_title')} confirmText={t('modal.delete_confirm')} cancelText={t('modal.cancel')} confirmButtonClass="bg-red-600 hover:bg-red-700 text-white">
                    <p>{t('modal.delete_message_content')}</p>
                </Modal>

                <input className="hidden" id="notes-drawer" type="checkbox" />
                <div>
                    <label className="xl:hidden flex items-center justify-between p-3 gap-2.5 bg-heymean-l dark:bg-heymean-d border-t border-b border-gray-200 dark:border-neutral-700 cursor-pointer" htmlFor="notes-drawer" id="notes-tab">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined !text-xl text-primary-text-light dark:text-primary-text-dark">description</span>
                            <span className="text-sm font-medium text-primary-text-light dark:text-primary-text-dark">{t('chat.notes_tab')}</span>
                        </div>
                        <span className="material-symbols-outlined !text-xl text-primary-text-light dark:text-primary-text-dark transform rotate-180">expand_less</span>
                    </label>
                    <footer className="p-3 bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-neutral-700">
                        <ChatInput onSend={handleSend} isThinking={isThinking} />
                    </footer>
                </div>
                <div className="xl:hidden fixed inset-0 bg-background-light dark:bg-background-dark flex flex-col transition-transform transform translate-y-full opacity-0 pointer-events-none z-10" id="notes-content">
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
