import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '../types';
import { getNotes, addNote, updateNote, deleteNote } from '../services/db';
import Modal from './Modal';
import { useTranslation } from '../hooks/useTranslation';
import MarkdownRenderer from './MarkdownRenderer';
import ListItemMenu from './ListItemMenu';


interface NotesViewProps {
    isDesktop?: boolean;
}

const NotePreview: React.FC<{
    note: Note;
    onEdit: () => void;
    onBack: () => void;
}> = ({ note, onEdit, onBack }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
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
            <div 
                className="w-full flex-1 p-4 rounded-2xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark text-sm focus:outline-none overflow-y-auto custom-scrollbar"
            >
                <MarkdownRenderer content={note.content} />
            </div>
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
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
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
                className="w-full flex-1 p-4 rounded-2xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark text-sm focus:outline-none resize-none"
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
    // FIX: Use `ReturnType<typeof setTimeout>` which is environment-agnostic and resolves to `number` in the browser, instead of the Node.js-specific `NodeJS.Timeout`.
    const longPressTimeout = useRef<ReturnType<typeof setTimeout>>();
    const isLongPress = useRef(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, noteId: number) => {
        isLongPress.current = false;
        longPressTimeout.current = setTimeout(() => {
            isLongPress.current = true;
            onNoteLongPress(noteId, { x: e.clientX, y: e.clientY });
        }, 500);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, note: Note) => {
        clearTimeout(longPressTimeout.current);
        if (!isLongPress.current) {
            onSelect(note);
        }
    };
    
    return (
        <div className="space-y-2">
            {notes.length > 0 ? notes.map(note => (
                <div 
                    key={note.id} 
                    className="p-3 cursor-pointer rounded-xl hover:bg-heymean-l dark:hover:bg-heymean-d border border-gray-200 dark:border-gray-700"
                    onPointerDown={(e) => handlePointerDown(e, note.id)}
                    onPointerUp={(e) => handlePointerUp(e, note)}
                    onPointerLeave={() => clearTimeout(longPressTimeout.current)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        isLongPress.current = true;
                        clearTimeout(longPressTimeout.current);
                        onNoteLongPress(note.id, { x: e.clientX, y: e.clientY });
                    }}
                >
                    <p className="font-semibold text-sm truncate text-primary-text-light dark:text-primary-text-dark pointer-events-none">{note.content.split('\n')[0] || t('notes.untitled')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1 pointer-events-none">{note.content.split('\n').slice(1).join(' ') || t('notes.no_content')}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pointer-events-none">{note.updatedAt.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            )) : <p className="text-center text-gray-500 dark:text-gray-400 mt-8">{t('notes.empty_state')}</p>}
        </div>
    );
}

export const NotesView: React.FC<NotesViewProps> = ({ isDesktop = false }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [originalNoteContent, setOriginalNoteContent] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isEditing, setIsEditing] = useState(false);
    const { t } = useTranslation();
    
    // State for modals & context menu
    const [menuState, setMenuState] = useState<{ isOpen: boolean; position: { x: number; y: number }; noteId: number | null }>({ isOpen: false, position: { x: 0, y: 0 }, noteId: null });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteToDeleteId, setNoteToDeleteId] = useState<number | null>(null);
    const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'back' | 'select' | 'new', note?: Note } | null>(null);
    const [isNewNote, setIsNewNote] = useState(false);

    const hasUnsavedChanges = activeNote && isEditing ? activeNote.content !== originalNoteContent : false;
    const shouldPromptOnExit = hasUnsavedChanges || (isNewNote && isEditing);

    const loadNotes = useCallback(async () => {
        const notesFromDb = await getNotes();
        setNotes(notesFromDb);
    }, []);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const transitionTo = (action: { type: 'back' | 'select' | 'new', note?: Note } | null) => {
        if (action?.type === 'select' && action.note) {
            setActiveNote(action.note);
            setOriginalNoteContent(action.note.content);
            setIsEditing(false);
            setIsNewNote(false);
        } else if (action?.type === 'new') {
            createNewNote();
        } else { // 'back' or null
            setActiveNote(null);
            setOriginalNoteContent(null);
            setIsEditing(false);
            setIsNewNote(false);
        }
        setPendingAction(null);
    };

    const createNewNote = async () => {
        const newNote = await addNote('New Note\n\n');
        await loadNotes();
        setActiveNote(newNote);
        setOriginalNoteContent(newNote.content);
        setIsEditing(true); // New notes go directly to edit mode
        setIsNewNote(true);
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
            setIsEditing(false); // Select goes to preview mode
            setIsNewNote(false);
        }
    };

    const handleSaveNote = async () => {
        if (activeNote) {
            setSaveStatus('saving');
            await new Promise(res => setTimeout(res, 300));
            const updated = await updateNote(activeNote);
            setOriginalNoteContent(updated.content); // Update original content after save
            setActiveNote(updated);
            await loadNotes();
            setSaveStatus('saved');
            setIsEditing(false); // Return to preview mode after saving
            setIsNewNote(false);
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };
    
    const handleDeleteRequest = (id: number | null) => {
        if (id === null) return;
        setNoteToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteNote = async () => {
        if (noteToDeleteId !== null) {
            await deleteNote(noteToDeleteId);
            await loadNotes();
            setActiveNote(null);
            setOriginalNoteContent(null);
            setIsDeleteModalOpen(false);
            setNoteToDeleteId(null);
            setIsNewNote(false);
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
            setIsEditing(false); // Reset editing state
            setIsNewNote(false);
        }
    }
    
    // --- Unsaved Changes Modal Handlers ---
    const handleConfirmSave = async () => {
        if (activeNote) {
            await handleSaveNote();
        }
        setIsUnsavedModalOpen(false);
        transitionTo(pendingAction);
    };

    const handleDiscard = async () => {
        setIsUnsavedModalOpen(false);
        const actionToPerform = pendingAction;
        setPendingAction(null);
    
        if (isNewNote && activeNote) {
            await deleteNote(activeNote.id);
            await loadNotes();
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

    const menuActions = [
        {
            label: t('list.delete'),
            icon: 'delete',
            isDestructive: true,
            onClick: () => handleDeleteRequest(menuState.noteId),
        },
    ];

    return (
        <div className="flex flex-col h-full w-full">
            <header className="flex items-center p-4 pb-3 justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-primary-text-light dark:text-primary-text-dark text-lg font-bold">{t('notes.header_title')}</h3>
                <div className="flex items-center">
                  {!isDesktop && <label htmlFor="notes-drawer" className="flex items-center justify-center size-10 cursor-pointer text-primary-text-light dark:text-primary-text-dark rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d"><span className="material-symbols-outlined !text-2xl">close</span></label>}
                  <button onClick={handleNewNote} className="flex items-center justify-center size-10 text-primary-text-light dark:text-primary-text-dark rounded-lg hover:bg-heymean-l dark:hover:bg-heymean-d">
                        <span className="material-symbols-outlined !text-2xl">add_circle</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 p-4 overflow-y-auto">
                {activeNote ? (
                    isEditing ? (
                        <NoteEditor
                            note={activeNote}
                            setNote={setActiveNote}
                            onSave={handleSaveNote}
                            onBack={handleBack}
                            saveStatus={saveStatus}
                        />
                    ) : (
                        <NotePreview
                            note={activeNote}
                            onEdit={() => setIsEditing(true)}
                            onBack={handleBack}
                        />
                    )
                ) : (
                    <NoteList notes={notes} onSelect={handleSelectNote} onNoteLongPress={handleNoteLongPress}/>
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
        </div>
    );
};