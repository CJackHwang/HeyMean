import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Note } from '@shared/types';
import Modal from './Modal';
import { useTranslation } from '@app/providers/useTranslation';
import ListItemMenu from './ListItemMenu';
import { NotePreview } from './Notes/NotePreview';
import { NoteEditor } from './Notes/NoteEditor';
import { NoteList } from './Notes/NoteList';
import { useNoteActions } from './Notes/useNoteActions';

interface NotesViewProps {
  isDesktop?: boolean;
}

type ViewState = 'list' | 'preview' | 'editing';

export const NotesView: React.FC<NotesViewProps> = React.memo(({ isDesktop = false }) => {
  const [viewState, setViewState] = useState<ViewState>('list');
  const { t } = useTranslation();

  const {
    notes,
    activeNote,
    setActiveNote,
    originalNoteContent,
    setOriginalNoteContent,
    saveStatus,
    isNewNote,
    setIsNewNote,
    saveStatusResetTimeoutRef,
    loadNotes,
    loadInitialNotes,
    createNewNote,
    saveNote,
    deleteNoteById,
    renameNote,
    pinNote,
  } = useNoteActions();

  const [menuState, setMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    note: Note | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, note: null });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<number | null>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'back' | 'select' | 'new'; note?: Note } | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [noteToRename, setNoteToRename] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const hasUnsavedChanges = useMemo(
    () => (activeNote && viewState === 'editing' ? activeNote.content !== originalNoteContent : false),
    [activeNote, viewState, originalNoteContent]
  );
  const shouldPromptOnExit = hasUnsavedChanges || (isNewNote && viewState === 'editing');

  useEffect(() => {
    loadInitialNotes();
    const handler = () => loadNotes();
    window.addEventListener('hm:settings-ready', handler);
    return () => window.removeEventListener('hm:settings-ready', handler);
  }, [loadInitialNotes, loadNotes]);

  useEffect(() => {
    const handleNotesChanged = () => loadNotes();
    window.addEventListener('hm:notes-changed', handleNotesChanged);
    return () => window.removeEventListener('hm:notes-changed', handleNotesChanged);
  }, [loadNotes]);

  useEffect(() => {
    return () => {
      if (saveStatusResetTimeoutRef.current !== null) {
        clearTimeout(saveStatusResetTimeoutRef.current);
      }
    };
  }, [saveStatusResetTimeoutRef]);

  const handleSelectNote = useCallback(
    (note: Note) => {
      if (shouldPromptOnExit) {
        setPendingAction({ type: 'select', note });
        setIsUnsavedModalOpen(true);
      } else {
        setActiveNote(note);
        setOriginalNoteContent(note.content);
        setIsNewNote(false);
        setViewState('preview');
      }
    },
    [shouldPromptOnExit, setActiveNote, setOriginalNoteContent, setIsNewNote]
  );

  const handleBack = useCallback(() => {
    if (shouldPromptOnExit) {
      setPendingAction({ type: 'back' });
      setIsUnsavedModalOpen(true);
    } else {
      setViewState('list');
      setActiveNote(null);
      setIsNewNote(false);
    }
  }, [shouldPromptOnExit, setActiveNote, setIsNewNote]);

  const handleEdit = useCallback(() => {
    setViewState('editing');
  }, []);

  const handleNoteLongPress = useCallback((note: Note, position: { x: number; y: number }) => {
    setMenuState({ isOpen: true, position, note });
  }, []);

  const handleSave = useCallback(async () => {
    await saveNote();
    if (isNewNote) {
      setTimeout(() => setViewState('preview'), 1500);
    }
  }, [saveNote, isNewNote]);

  const handleNew = useCallback(async () => {
    if (shouldPromptOnExit) {
      setPendingAction({ type: 'new' });
      setIsUnsavedModalOpen(true);
    } else {
      await createNewNote();
      setViewState('editing');
    }
  }, [shouldPromptOnExit, createNewNote]);

  const executePendingAction = useCallback(async (action: typeof pendingAction) => {
    if (!action) return;

    if (action.type === 'back') {
      setViewState('list');
      setActiveNote(null);
      setOriginalNoteContent(null);
      setIsNewNote(false);
      return;
    }

    if (action.type === 'select' && action.note) {
      setActiveNote(action.note);
      setOriginalNoteContent(action.note.content);
      setIsNewNote(false);
      setViewState('preview');
      return;
    }

    if (action.type === 'new') {
      await createNewNote();
      setViewState('editing');
    }
  }, [createNewNote, setActiveNote, setOriginalNoteContent, setIsNewNote]);

  const handleUnsavedSave = useCallback(async () => {
    if (!pendingAction) return;
    const didSave = await saveNote();
    if (!didSave) {
      return;
    }
    setIsUnsavedModalOpen(false);
    await executePendingAction(pendingAction);
    setPendingAction(null);
  }, [pendingAction, saveNote, executePendingAction]);

  const handleUnsavedDiscard = useCallback(async () => {
    if (!pendingAction) return;
    setIsUnsavedModalOpen(false);

    if (isNewNote && activeNote) {
      await deleteNoteById(activeNote.id);
      setActiveNote(null);
      setOriginalNoteContent(null);
      setIsNewNote(false);
    }

    await executePendingAction(pendingAction);
    setPendingAction(null);
  }, [pendingAction, executePendingAction, isNewNote, activeNote, deleteNoteById, setActiveNote, setOriginalNoteContent, setIsNewNote]);

  const handleUnsavedCancel = useCallback(() => {
    setIsUnsavedModalOpen(false);
    setPendingAction(null);
  }, []);

  const handleDelete = useCallback(
    async (noteId: number) => {
      setMenuState({ isOpen: false, position: { x: 0, y: 0 }, note: null });
      setNoteToDeleteId(noteId);
      setIsDeleteModalOpen(true);
    },
    []
  );

  const handleConfirmDelete = useCallback(async () => {
    if (noteToDeleteId !== null) {
      await deleteNoteById(noteToDeleteId);
      setIsDeleteModalOpen(false);
      setNoteToDeleteId(null);
    }
  }, [noteToDeleteId, deleteNoteById]);

  const handleRenameNote = useCallback(
    (note: Note) => {
      setMenuState({ isOpen: false, position: { x: 0, y: 0 }, note: null });
      setNoteToRename(note);
      setNewTitle(note.title || '');
      setIsRenameModalOpen(true);
    },
    []
  );

  const handleConfirmRename = useCallback(async () => {
    if (noteToRename && newTitle.trim()) {
      await renameNote(noteToRename.id, newTitle.trim());
      setIsRenameModalOpen(false);
      setNoteToRename(null);
      setNewTitle('');
    }
  }, [noteToRename, newTitle, renameNote]);

  const handlePin = useCallback(
    async (note: Note) => {
      setMenuState({ isOpen: false, position: { x: 0, y: 0 }, note: null });
      await pinNote(note.id);
    },
    [pinNote]
  );

  const menuItems = useMemo(
    () =>
      menuState.note
        ? [
            {
              label: t('list.rename'),
              onClick: () => handleRenameNote(menuState.note!),
              icon: 'edit',
            },
            {
              label: menuState.note.isPinned ? t('list.unpin') : t('list.pin'),
              onClick: () => handlePin(menuState.note!),
              icon: 'push_pin',
            },
            {
              label: t('list.delete'),
              onClick: () => handleDelete(menuState.note!.id),
              icon: 'delete',
              isDestructive: true,
            },
          ]
        : [],
    [menuState.note, t, handleRenameNote, handlePin, handleDelete]
  );

  const renderContent = useMemo(() => {
    if (viewState === 'preview' && activeNote) {
      return <NotePreview note={activeNote} onEdit={handleEdit} onBack={handleBack} />;
    }
    if (viewState === 'editing' && activeNote) {
      return (
        <NoteEditor
          note={activeNote}
          setNote={setActiveNote}
          onSave={handleSave}
          onBack={handleBack}
          saveStatus={saveStatus}
        />
      );
    }
    return <NoteList notes={notes} onSelect={handleSelectNote} onNoteLongPress={handleNoteLongPress} />;
  }, [
    viewState,
    activeNote,
    notes,
    handleEdit,
    handleBack,
    setActiveNote,
    handleSave,
    saveStatus,
    handleSelectNote,
    handleNoteLongPress,
  ]);

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center p-4 pb-3 justify-between border-b border-gray-200 dark:border-neutral-700 shrink-0">
        <h3 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold">
          {t('notes.header_title')}
        </h3>
        <div className="flex items-center">
          {!isDesktop && (
            <label
              htmlFor="notes-drawer"
              className="flex items-center justify-center size-10 cursor-pointer text-primary-text-light dark:text-primary-text-dark rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d"
            >
              <span className="material-symbols-outlined text-2xl!">close</span>
            </label>
          )}
          <button
            onClick={handleNew}
            className="flex items-center justify-center size-10 text-primary-text-light dark:text-primary-text-dark rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d"
          >
            <span className="material-symbols-outlined text-2xl!">add_circle</span>
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 overflow-y-auto">{renderContent}</main>

      <ListItemMenu
        isOpen={menuState.isOpen}
        onClose={() => setMenuState((state) => ({ ...state, isOpen: false }))}
        position={menuState.position}
        actions={menuItems}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('modal.delete_title')}
        message={t('modal.delete_content')}
        confirmText={t('modal.delete_confirm')}
        cancelText={t('modal.cancel')}
        onConfirm={handleConfirmDelete}
        confirmDestructive
      />

      <Modal
        isOpen={isUnsavedModalOpen}
        onClose={handleUnsavedCancel}
        title={t('modal.unsaved_title')}
        message={t('modal.unsaved_content')}
        confirmText={t('modal.unsaved_save')}
        cancelText={t('modal.cancel')}
        destructiveText={t('modal.unsaved_discard')}
        onConfirm={handleUnsavedSave}
        onDestructive={handleUnsavedDiscard}
      />

      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title={t('modal.rename_note_title')}
        message={t('modal.rename_note_content')}
        confirmText={t('modal.rename_save')}
        cancelText={t('modal.cancel')}
        onConfirm={handleConfirmRename}
        inputValue={newTitle}
        onInputChange={setNewTitle}
        inputPlaceholder={t('notes.untitled')}
      />
    </div>
  );
});

NotesView.displayName = 'NotesView';
