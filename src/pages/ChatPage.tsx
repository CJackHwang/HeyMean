import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Message, MessageSender, Attachment } from '@shared/types';
import { useConversation } from '@features/chat/model/useConversation';
import { getPayload, clearPayload } from '@shared/lib/preloadPayload';
import { useChatStream } from '@features/chat/model/useChatStream';
import { useMessageActions } from '@features/chat/model/useMessageActions';
import { useTranslation } from '@app/providers/useTranslation';
import { useToast } from '@app/providers/useToast';
import { handleError } from '@shared/services/errorHandler';
import { getLatestConversation } from '@shared/services/db';
import ListItemMenu from '@shared/ui/ListItemMenu';
import Modal from '@shared/ui/Modal';
import { NotesView } from '@shared/ui/NotesView';
import { useNotesPanel } from '@features/chat/model/useNotesPanel';
import { useScrollManagement } from '@features/chat/model/useScrollManagement';
import { useChatActions } from '@features/chat/model/useChatActions';
import ChatHeader from '@features/chat/ui/ChatHeader';
import ChatMessagesArea from '@features/chat/ui/ChatMessagesArea';
import ChatFooter from '@features/chat/ui/ChatFooter';
import NotesPanel from '@features/chat/ui/NotesPanel';

const ChatPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const isInitialLoad = useRef(true);
    const { initialPrompt, initialAttachments, newChat, conversationId: stateConversationId } = location.state || {};
    const { showToast } = useToast();

    const {
        messages,
        setMessages,
        currentConversationId,
        hasMoreMessages,
        isLoadingMore,
        loadConversation,
        loadMoreMessages,
        startNewConversation,
        addMessageToConversation,
        saveUpdatedMessage,
        deleteMessageFromConversation,
        deleteMultipleMessagesFromConversation,
        updateMessageInConversation,
    } = useConversation(stateConversationId);

    const { isThinking, streamedAiMessage, streamResponse, cancel } = useChatStream();

    const { rootRef, notesWidth, isNotesCollapsed, onHandlePointerDown } = useNotesPanel();

    const streamedMessageIdRef = useRef<string | null>(null);
    const topSentinelRef = useRef<HTMLDivElement | null>(null);
    const pendingTopLoad = useRef<{ prevScrollHeight: number; prevScrollTop: number; prevFirstId: string | null } | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (streamedAiMessage) {
            const exists = messages.some((m) => m.id === streamedAiMessage.id);
            if (exists) {
                setMessages((prev) => prev.map((m) => m.id === streamedAiMessage.id ? streamedAiMessage : m));
            } else {
                setMessages((prev) => [...prev, streamedAiMessage]);
            }
            
            streamedMessageIdRef.current = streamedAiMessage.id;
            
            if (!streamedAiMessage.isLoading && !streamedAiMessage.isThinkingComplete) {
            } else if (!streamedAiMessage.isLoading) {
                saveUpdatedMessage(streamedAiMessage);
                streamedMessageIdRef.current = null;
            }
        }
    }, [streamedAiMessage, setMessages, saveUpdatedMessage]);

    const rowVirtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => chatContainerRef.current,
        initialOffset: () => Number.MAX_SAFE_INTEGER,
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
                    thinkingSize = 80;
                }
            }
            return baseSize + (textLines * 18) + attachmentSize + thinkingSize;
        }, [messages]),
        overscan: 10,
    });

    const scrollManagement = useScrollManagement({
        messages,
        currentConversationId,
        rowVirtualizer,
        streamedMessageIdRef,
        pendingTopLoad,
        chatContainerRef,
    });

    const handleSend = useCallback(async (text: string, attachments: Attachment[]) => {
        if (!text.trim() && attachments.length === 0) return;
        scrollManagement.shouldForceScroll.current = true;

        let convId = currentConversationId;
        let chatHistory = messages;
        let userMessage: Message;

        if (!convId) {
            const { userMessage: newUserMessage, conversationId: newConvId } = await startNewConversation(text, attachments);
            convId = newConvId;
            userMessage = newUserMessage;
            chatHistory = [];
            navigate(location.pathname, { replace: true, state: { conversationId: newConvId } });
        } else {
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
    }, [currentConversationId, messages, navigate, location.pathname, startNewConversation, addMessageToConversation, streamResponse, scrollManagement.shouldForceScroll]);

    const chatActions = useChatActions({
        messages,
        isThinking,
        currentConversationId,
        streamResponse,
        deleteMultipleMessagesFromConversation,
        updateMessageInConversation,
        cancel,
        showToast,
        shouldForceScrollRef: scrollManagement.shouldForceScroll,
    });

    useEffect(() => {
        const loadAndInitialize = async () => {
            if (!isInitialLoad.current) return;
            isInitialLoad.current = false;

            if (!newChat && !stateConversationId) {
                try {
                    const latest = await getLatestConversation();
                    if (latest) {
                        navigate(location.pathname, { replace: true, state: { conversationId: latest.id } });
                    } else {
                        navigate('/', { replace: true });
                    }
                } catch {
                    navigate('/', { replace: true });
                }
                return;
            }

            if (stateConversationId) {
                if (currentConversationId === stateConversationId && messages.length > 0) {
                    scrollManagement.shouldForceScroll.current = true;
                } else {
                    const preId = getPayload<string>('chat:conversationId');
                    clearPayload('chat:conversationId');
                    const id = preId || stateConversationId;
                    loadConversation(id).then(() => {
                        scrollManagement.shouldForceScroll.current = true;
                    });
                }
            } else if (newChat) {
                setMessages([]);
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
    }, [stateConversationId, newChat, initialPrompt, initialAttachments, navigate, handleSend, loadConversation, setMessages, currentConversationId, messages.length, location.pathname, showToast, scrollManagement.shouldForceScroll]);

    const { menuState, deleteModalState, handleLongPress, confirmDeleteMessage, closeMenu, closeDeleteModal, menuActions } = useMessageActions({
        resend: chatActions.handleResend,
        regenerate: chatActions.handleRegenerate,
        delete: deleteMessageFromConversation,
        edit: chatActions.handleEditMessage,
    });

    return (
        <div ref={rootRef} className="relative flex h-screen min-h-screen w-full group/design-root overflow-hidden bg-background-light dark:bg-background-dark">
            <div className="flex-1 flex flex-col relative">
                <ChatHeader />

                <ChatMessagesArea
                    messages={messages}
                    rowVirtualizer={rowVirtualizer}
                    hasMoreMessages={hasMoreMessages}
                    isLoadingMore={isLoadingMore}
                    initialAnchored={scrollManagement.initialAnchored}
                    setChatContainerRef={scrollManagement.setChatContainerRef}
                    chatContainerRef={scrollManagement.chatContainerRef}
                    topSentinelRef={topSentinelRef}
                    handleLongPress={handleLongPress}
                    loadMoreMessages={loadMoreMessages}
                    pendingTopLoad={pendingTopLoad}
                />

                <ListItemMenu 
                    isOpen={menuState.isOpen} 
                    onClose={closeMenu} 
                    position={menuState.position} 
                    actions={menuActions} 
                />
                <Modal 
                    isOpen={deleteModalState.isOpen} 
                    onClose={closeDeleteModal} 
                    onConfirm={confirmDeleteMessage} 
                    title={t('modal.delete_message_title')} 
                    confirmText={t('modal.delete_confirm')} 
                    cancelText={t('modal.cancel')} 
                    confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
                >
                    <p>{t('modal.delete_message_content')}</p>
                </Modal>

                <input className="sr-only" id="notes-drawer" type="checkbox" />
                <ChatFooter
                    onSend={handleSend}
                    isThinking={isThinking}
                    onStop={cancel}
                    editingMessage={chatActions.editingMessage}
                    onCancelEdit={chatActions.handleCancelEdit}
                    onConfirmEdit={chatActions.handleConfirmEdit}
                />
                <div className="md:hidden fixed inset-0 bg-background-light dark:bg-background-dark flex flex-col opacity-0 pointer-events-none z-40" id="notes-content">
                    <NotesView />
                </div>
            </div>
            <NotesPanel
                notesWidth={notesWidth}
                isNotesCollapsed={isNotesCollapsed}
                onHandlePointerDown={onHandlePointerDown}
            />
        </div>
    );
};

export default ChatPage;
