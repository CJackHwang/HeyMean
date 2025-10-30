import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { Conversation } from '../types';
import { getConversations, deleteConversation, updateConversation } from '../services/db';
import ListItemMenu from '../components/ListItemMenu';
import Modal from '../components/Modal';

const ConversationList: React.FC<{ 
    conversations: Conversation[]; 
    onSelect: (conversation: Conversation) => void;
    onLongPress: (conversationId: string, position: { x: number; y: number; }) => void;
}> = ({ conversations, onSelect, onLongPress }) => {
    const { t } = useTranslation();
    // FIX: Use `ReturnType<typeof setTimeout>` which is environment-agnostic and resolves to `number` in the browser, instead of the Node.js-specific `NodeJS.Timeout`.
    const longPressTimeout = useRef<ReturnType<typeof setTimeout>>();
    const isLongPress = useRef(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, convId: string) => {
        isLongPress.current = false;
        longPressTimeout.current = setTimeout(() => {
            isLongPress.current = true;
            onLongPress(convId, { x: e.clientX, y: e.clientY });
        }, 500);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, conv: Conversation) => {
        clearTimeout(longPressTimeout.current);
        if (!isLongPress.current) {
            onSelect(conv);
        }
    };
    
    return (
        <div className="space-y-2">
            {conversations.length > 0 ? conversations.map(conv => (
                <div 
                    key={conv.id} 
                    className="relative p-3 cursor-pointer rounded-xl hover:bg-heymean-l dark:hover:bg-heymean-d border border-gray-200 dark:border-gray-700"
                    onPointerDown={(e) => handlePointerDown(e, conv.id)}
                    onPointerUp={(e) => handlePointerUp(e, conv)}
                    onPointerLeave={() => clearTimeout(longPressTimeout.current)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        isLongPress.current = true;
                        clearTimeout(longPressTimeout.current);
                        onLongPress(conv.id, { x: e.clientX, y: e.clientY });
                    }}
                >
                    {conv.isPinned && <span className="material-symbols-outlined !text-base text-gray-500 dark:text-gray-400 absolute top-2 right-2" style={{fontSize: '1rem'}}>push_pin</span>}
                    <p className="font-semibold text-sm truncate text-primary-text-light dark:text-primary-text-dark pointer-events-none pr-5">{conv.title}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pointer-events-none">{conv.updatedAt.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            )) : <p className="text-center text-gray-500 dark:text-gray-400 mt-8">{t('history.empty_state')}</p>}
        </div>
    );
}

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuState, setMenuState] = useState<{ isOpen: boolean; position: { x: number; y: number }; conversationId: string | null }>({ isOpen: false, position: { x: 0, y: 0 }, conversationId: null });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToDeleteId, setConversationToDeleteId] = useState<string | null>(null);
  
  // State for rename modal
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');


  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleSelectConversation = (conversation: Conversation) => {
    navigate('/chat', { state: { conversationId: conversation.id } });
  };

  const handleLongPress = (conversationId: string, position: { x: number, y: number }) => {
    setMenuState({ isOpen: true, conversationId, position });
  };

  const handleDeleteRequest = (id: string | null) => {
    if (id === null) return;
    setConversationToDeleteId(id);
    setIsDeleteModalOpen(true);
  };
  
  const handleRenameRequest = (id: string | null) => {
    if (id === null) return;
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
        setConversationToRename(conversation);
        setNewTitle(conversation.title);
        setIsRenameModalOpen(true);
    }
  };

  const handlePinToggleRequest = async (id: string | null) => {
    if (id === null) return;
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
        await updateConversation(id, { isPinned: !conversation.isPinned });
        await loadConversations();
    }
  };

  const confirmDelete = async () => {
    if (conversationToDeleteId) {
        await deleteConversation(conversationToDeleteId);
        setConversationToDeleteId(null);
        setIsDeleteModalOpen(false);
        // Refresh the list from the DB to ensure consistency
        await loadConversations();
    }
  };

  const confirmRename = async () => {
    if (conversationToRename && newTitle.trim()) {
        await updateConversation(conversationToRename.id, { title: newTitle.trim(), updatedAt: new Date() });
        setIsRenameModalOpen(false);
        setConversationToRename(null);
        setNewTitle('');
        await loadConversations();
    }
  };
  
  const activeConversationForMenu = conversations.find(c => c.id === menuState.conversationId);

  const menuActions = activeConversationForMenu ? [
    {
        label: activeConversationForMenu.isPinned ? t('list.unpin') : t('list.pin'),
        icon: 'push_pin',
        onClick: () => handlePinToggleRequest(menuState.conversationId),
    },
    {
        label: t('list.rename'),
        icon: 'edit',
        onClick: () => handleRenameRequest(menuState.conversationId),
    },
    {
        label: t('list.delete'),
        icon: 'delete',
        isDestructive: true,
        onClick: () => handleDeleteRequest(menuState.conversationId),
    },
  ] : [];

  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
      <header className="sticky top-0 z-10 flex items-center p-4 pb-3 justify-between shrink-0 border-b border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark">
        <button onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center">
          <span className="material-symbols-outlined !text-2xl text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
        </button>
        <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('history.header_title')}</h2>
        <div className="w-10 shrink-0"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        ) : (
            <ConversationList conversations={conversations} onSelect={handleSelectConversation} onLongPress={handleLongPress} />
        )}
      </div>

       <ListItemMenu 
          isOpen={menuState.isOpen}
          onClose={() => setMenuState({ ...menuState, isOpen: false })}
          position={menuState.position}
          actions={menuActions}
      />

       <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title={t('modal.delete_conversation_title')}
          confirmText={t('modal.delete_confirm')}
          cancelText={t('modal.cancel')}
          confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      >
          <p>{t('modal.delete_conversation_content')}</p>
      </Modal>

      <Modal
            isOpen={isRenameModalOpen}
            onClose={() => setIsRenameModalOpen(false)}
            onConfirm={confirmRename}
            title={t('modal.rename_conversation_title')}
            confirmText={t('modal.rename_save')}
            cancelText={t('modal.cancel')}
            confirmButtonClass="bg-primary hover:bg-primary/90 text-white dark:bg-white dark:text-black"
        >
            <p className="mb-2">{t('modal.rename_conversation_content')}</p>
            <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-2 rounded-lg bg-heymean-l dark:bg-background-dark/50 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-white"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmRename(); } }}
                autoFocus
            />
        </Modal>

    </div>
  );
};

export default HistoryPage;