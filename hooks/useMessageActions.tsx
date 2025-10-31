
import React, { useState, useCallback, useMemo } from 'react';
import { Message, MessageSender } from '../types';
import { Action } from '../components/ListItemMenu';
import { useTranslation } from './useTranslation';

interface MessageActionHandlers {
    resend: (message: Message) => Promise<void>;
    regenerate: (message: Message) => Promise<void>;
    delete: (messageId: string) => Promise<void>;
}

export const useMessageActions = (handlers: MessageActionHandlers) => {
    const { t } = useTranslation();
    const [menuState, setMenuState] = useState<{ isOpen: boolean; position: { x: number; y: number }; message: Message | null }>({ isOpen: false, position: { x: 0, y: 0 }, message: null });
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; messageId: string | null }>({ isOpen: false, messageId: null });

    const handleLongPress = useCallback((message: Message, position: { x: number, y: number }) => {
        setMenuState({ isOpen: true, message, position });
    }, []);

    const requestDeleteMessage = useCallback((messageId: string) => {
        setMenuState(prev => ({ ...prev, isOpen: false })); // Close menu before opening modal
        setDeleteModalState({ isOpen: true, messageId });
    }, []);

    const confirmDeleteMessage = useCallback(async () => {
        if (!deleteModalState.messageId) return;
        await handlers.delete(deleteModalState.messageId);
        setDeleteModalState({ isOpen: false, messageId: null });
    }, [deleteModalState.messageId, handlers]);

    const closeMenu = useCallback(() => setMenuState(prev => ({ ...prev, isOpen: false })), []);
    const closeDeleteModal = useCallback(() => setDeleteModalState({ isOpen: false, messageId: null }), []);

    const menuActions = useMemo(() => {
        const message = menuState.message;
        if (!message) return [];

        const actions: Action[] = [{ label: t('list.copy'), icon: 'content_copy', onClick: () => navigator.clipboard.writeText(message.text) }];
        if (message.sender === MessageSender.AI) {
            if (!message.isLoading) actions.push({ label: t('list.regenerate'), icon: 'refresh', onClick: () => handlers.regenerate(message) });
        } else {
            actions.push({ label: t('list.resend'), icon: 'send', onClick: () => handlers.resend(message) });
        }
        actions.push({ label: t('list.delete'), icon: 'delete', isDestructive: true, onClick: () => requestDeleteMessage(message.id) });
        return actions;
    }, [menuState.message, handlers.regenerate, handlers.resend, t, requestDeleteMessage]);

    return {
        menuState,
        deleteModalState,
        handleLongPress,
        confirmDeleteMessage,
        closeMenu,
        closeDeleteModal,
        menuActions,
    };
};
