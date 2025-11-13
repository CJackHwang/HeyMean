import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '@shared/types';
import { getNotes, addNote, updateNote, deleteNote } from '@shared/services/db';
import { getPayload, clearPayload } from '@shared/lib/preloadPayload';
import Modal from './Modal';
import { useTranslation } from '@app/providers/useTranslation';
import MarkdownSurface from './MarkdownSurface';
import ListItemMenu from './ListItemMenu';
import { useToast } from '@app/providers/useToast';
import { useLongPress } from '@shared/hooks/useLongPress';
import { formatDateTime } from '@shared/lib/dateHelpers';
import { handleError } from '@shared/services/errorHandler';


interface NotesViewProps {
    isDesktop?: boolean;
}

type ViewState = 'list' | 'preview' | 'editing';

const NotePreview: React.FC<{
    note: Note;
    onEdit: () => void;
    onBack: () => void;
}> = ({ note, onEdit, onBack }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <button onClick={onBack} className="flex items-center gap-1 p-2 rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d text-primary-text-light dark:text-primary-text-dark">
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                    {t('notes.all_notes')}
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="px-4 h-10 flex items-center justify-center rounded-lg bg-primary text-white dark:bg-white dark:text-black font-semibold transition-colors"
                    >
                        {t('notes.edit_button')}
                    </button>
                </div>
            </div>
            <MarkdownSurface
                className="w-full flex-1 text-sm focus:outline-hidden"
                scrollable
            >
                <MarkdownSurface.Content content={note.content} />
            </MarkdownSurface>
        </div>
    );
};

const NoteEditor: React.FC<{
    note: Note;
    setNote: (note: Note) => void;
    onSave: () => Promise<void>;
    onBack: () => void;
    saveStatus: 'idle' | 'saving' | 'saved';
}> = ({ note, setNote, onSave, onBack, saveStatus }) => {
    const { t } = useTranslation();
    const saveButtonText = saveStatus === 'saving' ? t('notes.saving_button') : saveStatus === 'saved' ? t('notes.saved_button') : t('notes.save_button');

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <button onClick={onBack} className="flex items-center gap-1 p-2 rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d text-primary-text-light dark:text-primary-text-dark">
                    <span className="material-symbols-outlined">arrow_back_ios</span>
                    {t('notes.all_notes')}
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onSave}
                        disabled={saveStatus === 'saving'}
                        className="px-4 h-10 flex items-center justify-center rounded-lg bg-primary text-white dark:bg-white dark:text-black font-semibold disabled:opacity-50 transition-colors"
                    >
                        {saveButtonText}
                    </button>
                </div>
            </div>
            <textarea
                value={note.content}
                onChange={(e) => setNote({ ...note, content: e.target.value })}
                className="w-full flex-1 p-4 rounded-2xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark text-sm focus:outline-hidden resize-none"
                placeholder={t('notes.placeholder')}
            />
        </div>
    );
};


const NoteList: React.FC<{ 
    notes: Note[]; 
    onSelect: (note: Note) => void; 
    onNoteLongPress: (noteId: number, position: { x: number, y: number }) => void;
}> = ({ notes, onSelect, onNoteLongPress }) => {
    const { t } = useTranslation();

    const handleLongPressCallback = useCallback((e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>, context: Note) => {
        onNoteLongPress(context.id, { x: e.clientX, y: e.clientY });
    }, [onNoteLongPress]);

    const handleClickCallback = useCallback((e: React.PointerEvent<HTMLDivElement>, context: Note) => {
        onSelect(context);
    }, [onSelect]);
    
    const getLongPressHandlers = useLongPress<HTMLDivElement, Note>(handleLongPressCallback, handleClickCallback);
    
    return (
        <div className="space-y-2">
            {notes.length > 0 ? notes.map(note => (
                <div 
                    key={note.id} 
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelect(note);
                        }
                    }}
                    className="relative p-3 cursor-pointer rounded-xl border border-gray-200 dark:border-neutral-700 transition-colors hover:bg-heymean-l dark:hover:bg-heymean-d data-[pressing=true]:bg-black/10 dark:data-[pressing=true]:bg-white/10 active:bg-black/10 dark:active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                    {...getLongPressHandlers(note)}
                >
                    {note.isPinned && <span className="material-symbols-outlined text-base! text-neutral-500 dark:text-neutral-400 absolute top-2 right-2" style={{fontSize: '1rem'}}>push_pin</span>}
                    <p className="font-semibold text-sm truncate text-primary-text-light dark:text-primary-text-dark pointer-events-none pr-5">{note.title || t('notes.untitled')}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-1 pointer-events-none">{(note.content || '').split('\n').slice(0, 2).join(' ') || t('notes.no_content')}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 pointer-events-none">{formatDateTime(note.updatedAt)}</p>
                </div>
            )) : <p className="text-center text-neutral-500 dark:text-neutral-400 mt-8">{t('notes.empty_state')}</p>}
        </div>
    );
}

export const NotesView: React.FC<NotesViewProps> = ({ isDesktop = false }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [originalNoteContent, setOriginalNoteContent] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [viewState, setViewState] = useState<ViewState>('list');
    const { t } = useTranslation();
    const { showToast } = useToast();
    const saveStatusResetTimeoutRef = useRef<number | null>(null);
    
    // State for modals & context menu
    const [menuState, setMenuState] = useState<{ isOpen: boolean; position: { x: number; y: number }; noteId: number | null }>({ isOpen: false, position: { x: 0, y: 0 }, noteId: null });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteToDeleteId, setNoteToDeleteId] = useState<number | null>(null);
    const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'back' | 'select' | 'new', note?: Note } | null>(null);
    const [isNewNote, setIsNewNote] = useState(false);
    
    // New state for rename modal
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [noteToRename, setNoteToRename] = useState<Note | null>(null);
    const [newTitle, setNewTitle] = useState('');


    const hasUnsavedChanges = activeNote && viewState === 'editing' ? activeNote.content !== originalNoteContent : false;
    const shouldPromptOnExit = hasUnsavedChanges || (isNewNote && viewState === 'editing');

    const loadNotes = useCallback(async () => {
        try {
            const notesFromDb = await getNotes();
            setNotes(notesFromDb);
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    }, [showToast]);

    useEffect(() => {
        // 首次挂载：优先使用路由预载载荷，避免动画收尾后再刷新
        const pre = getPayload<Note[]>('notes:list');
        if (pre && pre.length >= 0) {
            setNotes(pre);
            clearPayload('notes:list');
        } else {
            loadNotes();
        }
        // 启动就绪事件：仅在没有预载的情况下再加载一次
        const handler = () => {
            if (!pre) loadNotes();
        };
        window.addEventListener('hm:settings-ready', handler);
        return () => window.removeEventListener('hm:settings-ready', handler);
    }, [loadNotes]);

    useEffect(() => {
        const handleNotesChanged = () => {
            loadNotes();
        };
        window.addEventListener('hm:notes-changed', handleNotesChanged);
        return () => {
            window.removeEventListener('hm:notes-changed', handleNotesChanged);
        };
    }, [loadNotes]);

    useEffect(() => {
        return () => {
            if (saveStatusResetTimeoutRef.current !== null) {
                clearTimeout(saveStatusResetTimeoutRef.current);
                saveStatusResetTimeoutRef.current = null;
            }
        };
    }, []);

    const transitionTo = (action: { type: 'back' | 'select' | 'new', note?: Note } | null) => {
        if (action?.type === 'select' && action.note) {
            setActiveNote(action.note);
            setOriginalNoteContent(action.note.content);
            setViewState('preview');
            setIsNewNote(false);
        } else if (action?.type === 'new') {
            createNewNote();
        } else { // 'back' or null
            setActiveNote(null);
            setOriginalNoteContent(null);
            setViewState('list');
            setIsNewNote(false);
        }
        setPendingAction(null);
    };

    const createNewNote = async () => {
        try {
            const newNote = await addNote('New Note', '');
            await loadNotes();
            setActiveNote(newNote);
            setOriginalNoteContent(newNote.content);
            setViewState('editing'); // New notes go directly to edit mode
            setIsNewNote(true);
        } catch (error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        }
    };

    const handleNewNote = () => {
        if (shouldPromptOnExit) {
            setPendingAction({ type: 'new' });
            setIsUnsavedModalOpen(true);
        } else {
            createNewNote();
        }
    };
    
    const handleSelectNote = (note: Note) => {
        if (shouldPromptOnExit) {
            setPendingAction({ type: 'select', note });
            setIsUnsavedModalOpen(true);
        } else {
            setActiveNote(note);
            setOriginalNoteContent(note.content);
            setViewState('preview'); // Select goes to preview mode
            setIsNewNote(false);
        }
    };

    const handleSaveNote = async () => {
        if (activeNote) {
            if (!activeNote.content.trim()) {
                showToast(t('toast.input_required'), 'error');
                return;
            }
            try {
                setSaveStatus('saving');
                await new Promise(res => setTimeout(res, 300));
                await updateNote(activeNote.id, { content: activeNote.content });
                const updated = { ...activeNote, updatedAt: new Date() };
                setOriginalNoteContent(updated.content);
                setActiveNote(updated);
                await loadNotes();
                setSaveStatus('saved');
                setIsNewNote(false); // A new note is no longer "new" after the first save.
                setViewState('preview');

                // Reset save status after a short delay to show "Saved!" feedback
                if (saveStatusResetTimeoutRef.current !== null) {
                    clearTimeout(saveStatusResetTimeoutRef.current);
                }
                saveStatusResetTimeoutRef.current = window.setTimeout(() => {
                    setSaveStatus('idle');
                    saveStatusResetTimeoutRef.current = null;
                }, 1500);
            } catch (error) {
                const appError = handleError(error, 'db');
                showToast(appError.userMessage, 'error');
                setSaveStatus('idle');
            }
        }
    };
    
    const handleDeleteRequest = (id: number | null) => {
        if (id === null) return;
        setNoteToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteNote = async () => {
        if (noteToDeleteId !== null) {
            try {
                await deleteNote(noteToDeleteId);
                await loadNotes();
                setActiveNote(null);
                setOriginalNoteContent(null);
                setViewState('list');
                setIsNewNote(false);
            } catch (error) {
                const appError = handleError(error, 'db');
                showToast(appError.userMessage, 'error');
            } finally {
                setIsDeleteModalOpen(false);
                setNoteToDeleteId(null);
            }
        }
    };
    
    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setNoteToDeleteId(null);
    };

    const handleBack = () => {
        if (shouldPromptOnExit) {
            setPendingAction({ type: 'back' });
            setIsUnsavedModalOpen(true);
        } else {
            setActiveNote(null);
            setOriginalNoteContent(null);
            setViewState('list');
            setIsNewNote(false);
        }
    }
    
    // --- Unsaved Changes Modal Handlers ---
    const handleConfirmSave = async () => {
        if (activeNote) {
            if (!activeNote.content.trim()) {
                showToast(t('toast.input_required'), 'error');
                return;
            }
            // A simplified save that transitions to the next state without delay effects
            try {
                await updateNote(activeNote.id, { content: activeNote.content });
                await loadNotes();
                setIsNewNote(false);
            } catch (error) {
                const appError = handleError(error, 'db');
                showToast(appError.userMessage, 'error');
            }
        }
        setIsUnsavedModalOpen(false);
        transitionTo(pendingAction);
    };

    const handleDiscard = async () => {
        setIsUnsavedModalOpen(false);
        const actionToPerform = pendingAction;
        setPendingAction(null);
    
        if (isNewNote && activeNote) {
            try {
                await deleteNote(activeNote.id);
                await loadNotes();
            } catch (error) {
                const appError = handleError(error, 'db');
                showToast(appError.userMessage, 'error');
            }
        }
        
        transitionTo(actionToPerform);
    };

    const handleCancelTransition = () => {
        setIsUnsavedModalOpen(false);
        setPendingAction(null);
    };
    
    const handleNoteLongPress = (noteId: number, position: {x: number, y: number}) => {
        setMenuState({ isOpen: true, noteId, position });
    };

    const handleRenameRequest = (id: number | null) => {
        if (id === null) return;
        const note = notes.find(n => n.id === id);
        if (note) {
            setNoteToRename(note);
            setNewTitle(note.title || '');
            setIsRenameModalOpen(true);
        }
    };

    const handlePinToggleRequest = async (id: number | null) => {
        if (id === null) return;
        const note = notes.find(n => n.id === id);
        if (note) {
            try {
                await updateNote(id, { isPinned: !note.isPinned });
                await loadNotes();
            } catch (error) {
                const appError = handleError(error, 'db');
                showToast(appError.userMessage, 'error');
            }
        }
    };
    
    const confirmRename = async () => {
        if (!noteToRename) return;
        const trimmed = newTitle.trim();
        if (!trimmed) {
            showToast(t('toast.input_required'), 'error');
            return;
        }
        try {
            await updateNote(noteToRename.id, { title: trimmed });
            if (activeNote && activeNote.id === noteToRename.id) {
                setActiveNote({ ...activeNote, title: trimmed, updatedAt: new Date() });
            }
            await loadNotes();
        } catch(error) {
            const appError = handleError(error, 'db');
            showToast(appError.userMessage, 'error');
        } finally {
            setIsRenameModalOpen(false);
            setNoteToRename(null);
            setNewTitle('');
        }
    };

    const activeNoteForMenu = notes.find(n => n.id === menuState.noteId);

    const menuActions = activeNoteForMenu ? [
        {
            label: activeNoteForMenu.isPinned ? t('list.unpin') : t('list.pin'),
            icon: 'push_pin',
            onClick: () => handlePinToggleRequest(menuState.noteId),
        },
        {
            label: t('list.rename'),
            icon: 'edit',
            onClick: () => handleRenameRequest(menuState.noteId),
        },
        {
            label: t('list.delete'),
            icon: 'delete',
            isDestructive: true,
            onClick: () => handleDeleteRequest(menuState.noteId),
        },
    ] : [];


    return (
        <div className="flex flex-col h-full w-full">
            <header className="flex items-center p-4 pb-3 justify-between border-b border-gray-200 dark:border-neutral-700 shrink-0">
                <h3 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold">{t('notes.header_title')}</h3>
                <div className="flex items-center">
                  {!isDesktop && <label htmlFor="notes-drawer" className="flex items-center justify-center size-10 cursor-pointer text-primary-text-light dark:text-primary-text-dark rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d"><span className="material-symbols-outlined text-2xl!">close</span></label>}
                  <button onClick={handleNewNote} className="flex items-center justify-center size-10 text-primary-text-light dark:text-primary-text-dark rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d">
                        <span className="material-symbols-outlined text-2xl!">add_circle</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 p-4 overflow-y-auto">
                {viewState === 'list' && (
                    <NoteList notes={notes} onSelect={handleSelectNote} onNoteLongPress={handleNoteLongPress}/>
                )}
                {viewState === 'preview' && activeNote && (
                    <NotePreview
                        note={activeNote}
                        onEdit={() => setViewState('editing')}
                        onBack={handleBack}
                    />
                )}
                {viewState === 'editing' && activeNote && (
                     <NoteEditor
                        note={activeNote}
                        setNote={setActiveNote}
                        onSave={handleSaveNote}
                        onBack={handleBack}
                        saveStatus={saveStatus}
                    />
                )}
            </main>
            <ListItemMenu 
                isOpen={menuState.isOpen}
                onClose={() => setMenuState({ ...menuState, isOpen: false })}
                position={menuState.position}
                actions={menuActions}
            />
             <Modal
                isOpen={isDeleteModalOpen}
                onClose={cancelDelete}
                onConfirm={confirmDeleteNote}
                title={t('modal.delete_title')}
                confirmText={t('modal.delete_confirm')}
                cancelText={t('modal.cancel')}
                confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
            >
                <p>{t('modal.delete_content')}</p>
            </Modal>
            <Modal
                isOpen={isUnsavedModalOpen}
                onClose={handleCancelTransition}
                onConfirm={handleConfirmSave}
                onDestructive={handleDiscard}
                title={t('modal.unsaved_title')}
                confirmText={t('modal.unsaved_save')}
                destructiveText={t('modal.unsaved_discard')}
                cancelText={t('modal.cancel')}
                confirmButtonClass="bg-primary hover:bg-primary/90 text-white dark:bg-white dark:text-black"
                destructiveButtonClass="text-red-500 hover:bg-red-500/10"
            >
                <p>{t('modal.unsaved_content')}</p>
            </Modal>
             <Modal
                isOpen={isRenameModalOpen}
                onClose={() => setIsRenameModalOpen(false)}
                onConfirm={confirmRename}
                title={t('modal.rename_note_title')}
                confirmText={t('modal.rename_save')}
                cancelText={t('modal.cancel')}
                confirmButtonClass="bg-primary hover:bg-primary/90 text-white dark:bg-white dark:text-black"
            >
                <p className="mb-2">{t('modal.rename_note_content')}</p>
                <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-2 rounded-lg bg-heymean-l dark:bg-background-dark/50 focus:outline-hidden focus:ring-2 focus:ring-primary dark:focus:ring-white"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmRename(); } }}
                    autoFocus
                />
            </Modal>
        </div>
    );
};
