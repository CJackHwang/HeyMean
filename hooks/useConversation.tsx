import { useState, useCallback, useEffect } from 'react';
import { Message, Conversation, Attachment, MessageSender } from '../types';
import { getMessages, addMessage, deleteMessage, addConversation, updateConversation, initDB } from '../services/db';

export const useConversation = (initialConversationId: string | null) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(initialConversationId);

    useEffect(() => {
        initDB().catch(error => console.error("Failed to initialize database:", error));
    }, []);

    const loadConversation = useCallback(async (id: string) => {
        try {
            const history = await getMessages(id);
            const historyWithPreviews = await Promise.all(history.map(async (m) => {
                if (m.attachments && m.attachments.length > 0) {
                    m.attachments = await Promise.all(m.attachments.map(async (att) => {
                        if (att.data && att.type.startsWith('image/')) {
                            try {
                                const response = await fetch(att.data);
                                const blob = await response.blob();
                                att.preview = URL.createObjectURL(blob);
                            } catch (e) { console.error("Error creating blob from data URL:", e); }
                        }
                        return att;
                    }));
                }
                return m;
            }));
            setMessages(historyWithPreviews);
            setCurrentConversationId(id);
        } catch (error) {
            console.error("Failed to load conversation history:", error);
        }
    }, []);

    const startNewConversation = useCallback(async (text: string, attachments: Attachment[]): Promise<{ userMessage: Message, conversationId: string }> => {
        try {
            const newConversationId = Date.now().toString();
            const title = text.substring(0, 50) || (attachments.length > 0 ? attachments[0].name : "New Conversation");
            const newConversation: Conversation = { id: newConversationId, title, createdAt: new Date(), updatedAt: new Date() };
            await addConversation(newConversation);

            const userMessage: Message = {
                id: Date.now().toString(),
                conversationId: newConversationId,
                sender: MessageSender.USER,
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                attachments,
                isLoading: false,
            };
            await addMessage(userMessage);
            
            setMessages([userMessage]);
            setCurrentConversationId(newConversationId);
            return { userMessage, conversationId: newConversationId };
        } catch (error) {
            console.error("Failed to start new conversation:", error);
            // Rethrow or handle error to notify the caller
            throw error;
        }
    }, []);

    const addMessageToConversation = useCallback(async (message: Message) => {
        if (!currentConversationId) {
            console.error("Cannot add message, no conversation is active.");
            return;
        }
        try {
            const messageWithId = { ...message, conversationId: currentConversationId };
            setMessages(prev => [...prev, messageWithId]);
            await addMessage(messageWithId);
            await updateConversation(currentConversationId, { updatedAt: new Date() });
        } catch (error) {
            console.error("Failed to add message to conversation:", error);
        }
    }, [currentConversationId]);

    const saveUpdatedMessage = useCallback(async (message: Message) => {
        try {
            await addMessage(message);
            if (message.conversationId) {
                await updateConversation(message.conversationId, { updatedAt: new Date() });
            }
        } catch (error) {
            console.error("Failed to save updated message:", error);
        }
    }, []);

    const deleteMessageFromConversation = useCallback(async (messageId: string) => {
        try {
            setMessages(prev => prev.filter(m => m.id !== messageId));
            await deleteMessage(messageId);
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    }, []);

    // Revoke object URLs on cleanup
    useEffect(() => {
        return () => {
            messages.forEach(msg => {
                if (msg.attachments) {
                    msg.attachments.forEach(att => {
                        if (att.preview) URL.revokeObjectURL(att.preview);
                    });
                }
            });
        };
    }, [messages]);

    return {
        messages,
        setMessages,
        currentConversationId,
        loadConversation,
        startNewConversation,
        addMessageToConversation,
        saveUpdatedMessage,
        deleteMessageFromConversation,
    };
};