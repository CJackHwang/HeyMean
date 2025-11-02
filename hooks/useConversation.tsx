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

            const urlsToRelease: string[] = [];
            urlsToRevoke.current.forEach((url) => urlsToRelease.push(url));
            urlsToRevoke.current.clear();

            const historyWithPreviews = await Promise.all(history.map(async (message) => {
                if (!message.attachments || message.attachments.length === 0) {
                    return message;
                }

                const attachmentsWithPreview = await Promise.all(message.attachments.map(async (attachment) => {
                    if (!attachment.data || !attachment.type.startsWith('image/')) {
                        return attachment;
                    }

                    try {
                        const response = await fetch(attachment.data);
                        const blob = await response.blob();
                        const previewUrl = URL.createObjectURL(blob);
                        urlsToRevoke.current.add(previewUrl);
                        return { ...attachment, preview: previewUrl };
                    } catch (error) {
                        console.error("Error creating blob from data URL:", error);
                        return attachment;
                    }
                }));

                return { ...message, attachments: attachmentsWithPreview };
            }));
            setMessages(historyWithPreviews);
            setCurrentConversationId(id);

            urlsToRelease.forEach((url) => {
                try {
                    URL.revokeObjectURL(url);
                } catch {}
            });
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [showToast]);

    const startNewConversation = useCallback(async (text: string, attachments: Attachment[]): Promise<{ userMessage: Message, conversationId: string }> => {
        try {
            const now = Date.now();
            const newConversationId = now.toString();
            const title = text.substring(0, 50).trim() || (attachments.length > 0 ? attachments[0].name : "New Conversation");
            const newConversation: Conversation = {
                id: newConversationId,
                title,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await addConversation(newConversation);

            attachments.forEach(attachment => {
                if (attachment.preview) {
                    urlsToRevoke.current.add(attachment.preview);
                }
            });

            const userMessage: Message = {
                id: (now + 1).toString(),
                conversationId: newConversationId,
                sender: MessageSender.USER,
                text,
                timestamp: new Date(),
                attachments,
                isLoading: false,
            };
            await addMessage(userMessage);
            conversationCache.delete(newConversationId);
            
            setMessages([userMessage]);
            setCurrentConversationId(newConversationId);
            return { userMessage, conversationId: newConversationId };
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
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
            // 使预加载缓存失效，避免返回页面时读取到旧数据
            conversationCache.delete(currentConversationId);
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
                // 失效对应会话的缓存，确保后续加载从数据库读取最新消息
                conversationCache.delete(message.conversationId);
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
            if (currentConversationId) {
                conversationCache.delete(currentConversationId);
            }
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [currentConversationId, showToast]);

    const deleteMultipleMessagesFromConversation = useCallback(async (messageIds: string[]) => {
        try {
            setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
            await batchDeleteMessages(messageIds);
            if (currentConversationId) {
                conversationCache.delete(currentConversationId);
            }
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [currentConversationId, showToast]);

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
