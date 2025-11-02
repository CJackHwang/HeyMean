import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Conversation, Attachment, MessageSender } from '../types';
import { getMessages, addMessage, deleteMessage, batchDeleteMessages, addConversation, updateConversation, initDB } from '../services/db';
import { useToast } from './useToast';
import { handleError } from '../services/errorHandler';
import { getCache } from '../utils/preload';

// 全局预加载缓存，通过 util 管理，跨组件与过渡层复用
const conversationCache = getCache<string, Message[]>('conversation');

export const useConversation = (initialConversationId: string | null) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId);
    const urlsToRevoke = useRef(new Set<string>());
    const { showToast } = useToast();

    useEffect(() => {
        initDB().catch(error => {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        });
        
        // Return cleanup function that runs on unmount
        return () => {
            urlsToRevoke.current.forEach(url => URL.revokeObjectURL(url));
            urlsToRevoke.current.clear();
        };
    }, []); // Empty dependency array ensures this runs only on mount and unmount

    const preloadConversation = useCallback(async (id: string) => {
        try {
            await conversationCache.preload(id, getMessages);
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [showToast]);

    const loadConversation = useCallback(async (id: string) => {
        try {
            const history = await conversationCache.load(id, getMessages);
            const historyWithPreviews = await Promise.all(history.map(async (m) => {
                if (m.attachments && m.attachments.length > 0) {
                    m.attachments = await Promise.all(m.attachments.map(async (att) => {
                        if (att.data && att.type.startsWith('image/')) {
                            try {
                                const response = await fetch(att.data);
                                const blob = await response.blob();
                                const previewUrl = URL.createObjectURL(blob);
                                att.preview = previewUrl;
                                urlsToRevoke.current.add(previewUrl);
                            } catch (e) { console.error("Error creating blob from data URL:", e); }
                        }
                        return att;
                    }));
                }
                return m;
            }));
            setMessages(historyWithPreviews);
            setCurrentConversationId(id);
            // 按需保留缓存提高后退体验；如需释放内存可调用 conversationCache.delete(id)
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [showToast]);

    const startNewConversation = useCallback(async (text: string, attachments: Attachment[]): Promise<{ userMessage: Message, conversationId: string }> => {
        try {
            const newConversationId = Date.now().toString();
            const title = text.substring(0, 50) || (attachments.length > 0 ? attachments[0].name : "New Conversation");
            const newConversation: Conversation = { id: newConversationId, title, createdAt: new Date(), updatedAt: new Date() };
            await addConversation(newConversation);

            attachments.forEach(att => {
                if (att.preview) {
                    urlsToRevoke.current.add(att.preview);
                }
            });

            const userMessage: Message = {
                id: Date.now().toString(),
                conversationId: newConversationId,
                sender: MessageSender.USER,
                text,
                timestamp: new Date(),
                attachments,
                isLoading: false,
            };
            await addMessage(userMessage);
            
            setMessages([userMessage]);
            setCurrentConversationId(newConversationId);
            return { userMessage, conversationId: newConversationId };
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
            // Rethrow or handle error to notify the caller
            throw error;
        }
    }, [showToast]);

    const addMessageToConversation = useCallback(async (message: Message) => {
        if (!currentConversationId) {
            console.error("Cannot add message, no conversation is active.");
            return;
        }
        try {
            if (message.attachments) {
                message.attachments.forEach(att => {
                    if (att.preview) {
                        urlsToRevoke.current.add(att.preview);
                    }
                });
            }
            const messageWithId = { ...message, conversationId: currentConversationId };
            setMessages(prev => [...prev, messageWithId]);
            await addMessage(messageWithId);
            await updateConversation(currentConversationId, { updatedAt: new Date() });
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [currentConversationId, showToast]);

    const saveUpdatedMessage = useCallback(async (message: Message) => {
        try {
            await addMessage(message);
            if (message.conversationId) {
                await updateConversation(message.conversationId, { updatedAt: new Date() });
            }
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [showToast]);

    const deleteMessageFromConversation = useCallback(async (messageId: string) => {
        try {
            setMessages(prev => prev.filter(m => m.id !== messageId));
            await deleteMessage(messageId);
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [showToast]);

    const deleteMultipleMessagesFromConversation = useCallback(async (messageIds: string[]) => {
        try {
            setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
            await batchDeleteMessages(messageIds);
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [showToast]);

    return {
        messages,
        setMessages,
        currentConversationId,
        preloadConversation,
        loadConversation,
        startNewConversation,
        addMessageToConversation,
        saveUpdatedMessage,
        deleteMessageFromConversation,
        deleteMultipleMessagesFromConversation,
    };
};
