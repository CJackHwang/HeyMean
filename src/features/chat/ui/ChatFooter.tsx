import React from 'react';
import ChatInput from '@shared/ui/ChatInput';
import { Attachment, Message } from '@shared/types';
import { useTranslation } from '@app/providers/useTranslation';

interface ChatFooterProps {
    onSend: (text: string, attachments: Attachment[]) => Promise<void>;
    isThinking: boolean;
    onStop: () => void;
    editingMessage: Message | null;
    onCancelEdit: () => void;
    onConfirmEdit: (text: string, attachments: Attachment[]) => Promise<void>;
}

const ChatFooter: React.FC<ChatFooterProps> = ({
    onSend,
    isThinking,
    onStop,
    editingMessage,
    onCancelEdit,
    onConfirmEdit,
}) => {
    const { t } = useTranslation();

    return (
        <div className="chat-footer-safe">
            <label
                className="md:hidden flex items-center justify-between p-3 gap-2.5 bg-heymean-l dark:bg-heymean-d border-t border-b border-gray-200 dark:border-neutral-700 cursor-pointer"
                htmlFor="notes-drawer"
                id="notes-tab"
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl! text-primary-text-light dark:text-primary-text-dark">
                        description
                    </span>
                    <span className="text-sm font-medium text-primary-text-light dark:text-primary-text-dark">
                        {t('chat.notes_tab')}
                    </span>
                </div>
                <span className="material-symbols-outlined text-xl! text-primary-text-light dark:text-primary-text-dark transform rotate-180">
                    expand_less
                </span>
            </label>
            <footer className="p-3 bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-neutral-700">
                <ChatInput
                    onSend={onSend}
                    isThinking={isThinking}
                    onStop={onStop}
                    editingMessage={editingMessage}
                    onCancelEdit={onCancelEdit}
                    onConfirmEdit={onConfirmEdit}
                />
            </footer>
        </div>
    );
};

export default ChatFooter;
