import { useCallback, useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Attachment, Message, MessageSender } from '../../../types';
import { handleError } from '../../../services/errorHandler';

interface UseChatActionsProps {
    messages: Message[];
    isThinking: boolean;
    currentConversationId: string | null;
    streamResponse: (chatHistory: Message[], userMessage: Message, aiMessageId: string) => Promise<void>;
    deleteMultipleMessagesFromConversation: (messageIds: string[]) => Promise<void>;
    updateMessageInConversation: (messageId: string, updates: Partial<Message>) => Promise<Message | null>;
    cancel: () => void;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    shouldForceScrollRef: MutableRefObject<boolean>;
}

interface UseChatActionsResult {
    editingMessage: Message | null;
    handleResend: (userMessage: Message) => Promise<void>;
    handleRegenerate: (aiMessage: Message) => Promise<void>;
    handleEditMessage: (message: Message) => void;
    handleConfirmEdit: (updatedText: string, updatedAttachments: Attachment[]) => Promise<void>;
    handleCancelEdit: () => void;
}

export const useChatActions = ({
    messages,
    isThinking,
    currentConversationId,
    streamResponse,
    deleteMultipleMessagesFromConversation,
    updateMessageInConversation,
    cancel,
    showToast,
    shouldForceScrollRef,
}: UseChatActionsProps): UseChatActionsResult => {
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);

    const handleResend = useCallback(async (userMessageToResend: Message) => {
        shouldForceScrollRef.current = true;
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
    }, [messages, deleteMultipleMessagesFromConversation, streamResponse, shouldForceScrollRef]);

    const handleRegenerate = useCallback(async (aiMessageToRegenerate: Message) => {
        shouldForceScrollRef.current = true;
        const messageIndex = messages.findIndex(m => m.id === aiMessageToRegenerate.id);
        if (messageIndex <= 0) return;
        const promptMessage = messages[messageIndex - 1];
        if (promptMessage.sender !== MessageSender.USER) return;

        const chatHistory = messages.slice(0, messageIndex - 1);
        await streamResponse(chatHistory, promptMessage, aiMessageToRegenerate.id);
    }, [messages, streamResponse, shouldForceScrollRef]);

    const handleEditMessage = useCallback((message: Message) => {
        if (isThinking) {
            cancel();
        }
        const target = messages.find(m => m.id === message.id) ?? message;
        setEditingMessage(target);
    }, [messages, isThinking, cancel]);

    const handleConfirmEdit = useCallback(async (updatedText: string, updatedAttachments: Attachment[]) => {
        if (!editingMessage) return;

        const messageIndex = messages.findIndex(m => m.id === editingMessage.id);
        if (messageIndex < 0) {
            setEditingMessage(null);
            return;
        }

        try {
            if (isThinking) {
                cancel();
            }

            const persistedMessage = await updateMessageInConversation(editingMessage.id, {
                text: updatedText,
                attachments: updatedAttachments,
            });

            if (!persistedMessage) {
                return;
            }

            setEditingMessage(null);
            shouldForceScrollRef.current = true;
        } catch (error) {
            const appError = handleError(error, 'api');
            showToast(appError.userMessage, 'error');
        }
    }, [editingMessage, messages, updateMessageInConversation, cancel, isThinking, showToast, shouldForceScrollRef]);

    const handleCancelEdit = useCallback(() => {
        setEditingMessage(null);
    }, []);

    useEffect(() => {
        setEditingMessage(null);
    }, [currentConversationId]);

    useEffect(() => {
        if (editingMessage && !messages.some(m => m.id === editingMessage.id)) {
            setEditingMessage(null);
        }
    }, [messages, editingMessage]);

    return {
        editingMessage,
        handleResend,
        handleRegenerate,
        handleEditMessage,
        handleConfirmEdit,
        handleCancelEdit,
    };
};
