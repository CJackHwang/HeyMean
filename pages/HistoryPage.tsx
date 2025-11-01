import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { Conversation } from '../types';
import { getConversations, deleteConversation, updateConversation } from '../services/db';
import ListItemMenu from '../components/ListItemMenu';
import Modal from '../components/Modal';
import { useToast } from '../hooks/useToast';
import { useLongPress } from '../hooks/useLongPress';
import { formatDateTime } from '../utils/dateHelpers';
import { handleError } from '../services/errorHandler';

const ConversationList: React.FC<{ 
    conversations: Conversation[]; 
    onSelect: (conversation: Conversation) => void;
    onLongPress: (conversationId: string, position: { x: number; y: number; }) => void;
}> = ({ conversations, onSelect, onLongPress }) => {
    const { t } = useTranslation();

    const handleLongPressCallback = useCallback((e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, context: Conversation) => {
        onLongPress(context.id, { x: e.clientX, y: e.clientY });
    }, [onLongPress]);

    const handleClickCallback = useCallback((e: React.PointerEvent<HTMLDivElement>, context: Conversation) => {
        onSelect(context);
    }, [onSelect]);

    const getLongPressHandlers = useLongPress<HTMLDivElement, Conversation>(handleLongPressCallback, handleClickCallback);
    
    return (
        <div className="space-y-2">
            {conversations.length > 0 ? conversations.map(conv => (
                <div 
                    key={conv.id} 
                    className="relative p-3 cursor-pointer rounded-xl hover:bg-heymean-l dark:hover:bg-heymean-d border border-gray-200 dark:border-neutral-700"
                    {...getLongPressHandlers(conv)}
                >
                    {conv.isPinned && <span className="material-symbols-outlined !text-base text-neutral-500 dark:text-neutral-400 absolute top-2 right-2" style={{fontSize: '1rem'}}>push_pin</span>}
                    <p className="font-semibold text-sm truncate text-primary-text-light dark:text-primary-text-dark pointer-events-none pr-5">{conv.title}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 pointer-events-none">{formatDateTime(conv.updatedAt)}</p>
                </div>
            )) : <p className="text-center text-neutral-500 dark:text-neutral-400 mt-8">{t('history.empty_state')}</p>}
        </div>
    );
}

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuState, setMenuState] = useState<{ isOpen: boolean; position: { x: number; y: number }; conversationId: string | null }>({ isOpen: false, position: { x: 0, y: 0 }, conversationId: null });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToDeleteId, setConversationToDeleteId] = useState<string | null>(null);
  
  // State for rename modal
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [conversationToRename, setConversationToRename] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');


  const loadConversations = async () => {
    try {
      // Fetch in background without showing spinner
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      const appError = handleError(error, 'db');
      showToast(appError.userMessage, 'error');
    } finally {
      // No visible loading state
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load without blocking UI
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
        try {
            await updateConversation(id, { isPinned: !conversation.isPinned });
            await loadConversations();
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }
  };

  const confirmDelete = async () => {
    if (conversationToDeleteId) {
        try {
            await deleteConversation(conversationToDeleteId);
            // Refresh the list from the DB to ensure consistency
            await loadConversations();
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        } finally {
            setConversationToDeleteId(null);
            setIsDeleteModalOpen(false);
        }
    }
  };

  const confirmRename = async () => {
    if (conversationToRename && newTitle.trim()) {
        try {
            await updateConversation(conversationToRename.id, { title: newTitle.trim(), updatedAt: new Date() });
            await loadConversations();
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        } finally {
            setIsRenameModalOpen(false);
            setConversationToRename(null);
            setNewTitle('');
        }
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

  return (
    <div className="relative flex h-screen min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
      <header className="sticky top-0 z-10 flex items-center p-4 pb-3 justify-between shrink-0 border-b border-gray-200 dark:border-neutral-700 bg-background-light dark:bg-background-dark">
        <button onClick={handleBack} className="flex size-10 shrink-0 items-center justify-center">
          <span className="material-symbols-outlined !text-2xl text-primary-text-light dark:text-primary-text-dark">arrow_back</span>
        </button>
        <h2 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('history.header_title')}</h2>
        <div className="w-10 shrink-0"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <ConversationList conversations={conversations} onSelect={handleSelectConversation} onLongPress={handleLongPress} />
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
