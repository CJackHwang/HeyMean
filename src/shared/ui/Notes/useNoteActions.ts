import { useState, useRef, useCallback } from 'react';
import { Note } from '@shared/types';
import { getNotes, addNote, updateNote, deleteNote } from '@shared/services/db';
import { getPayload, clearPayload } from '@shared/lib/preloadPayload';
import { useToast } from '@app/providers/useToast';
import { handleError } from '@shared/services/errorHandler';
import { useTranslation } from '@app/providers/useTranslation';

export const useNoteActions = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [originalNoteContent, setOriginalNoteContent] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isNewNote, setIsNewNote] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();
  const saveStatusResetTimeoutRef = useRef<number | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const notesFromDb = await getNotes();
      setNotes(notesFromDb);
    } catch (error) {
      const appError = handleError(error, 'db');
      showToast(appError.userMessage, 'error');
    }
  }, [showToast]);

  const loadInitialNotes = useCallback(() => {
    const pre = getPayload<Note[]>('notes:list');
    if (pre && pre.length >= 0) {
      setNotes(pre);
      clearPayload('notes:list');
    } else {
      loadNotes();
    }
  }, [loadNotes]);

  const createNewNote = useCallback(async () => {
    try {
      const addedNote = await addNote(t('notes.untitled'), '');
      await loadNotes();
      setActiveNote(addedNote);
      setOriginalNoteContent(addedNote.content);
      setIsNewNote(true);
      return addedNote;
    } catch (error) {
      const appError = handleError(error, 'db');
      showToast(appError.userMessage, 'error');
      throw error;
    }
  }, [t, loadNotes, showToast]);

  const saveNote = useCallback(async (): Promise<boolean> => {
    if (!activeNote) return false;
    
    if (!activeNote.content.trim()) {
      showToast(t('toast.input_required'), 'error');
      return false;
    }

    setSaveStatus('saving');
    try {
      await new Promise(res => setTimeout(res, 300));
      await updateNote(activeNote.id, { content: activeNote.content, updatedAt: new Date() });
      const updated = { ...activeNote, updatedAt: new Date() };
      setOriginalNoteContent(updated.content);
      setActiveNote(updated);
      await loadNotes();
      setSaveStatus('saved');
      setIsNewNote(false);

      if (saveStatusResetTimeoutRef.current !== null) {
        clearTimeout(saveStatusResetTimeoutRef.current);
      }
      saveStatusResetTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('idle');
        saveStatusResetTimeoutRef.current = null;
      }, 1500);
      return true;
    } catch (error) {
      const appError = handleError(error, 'db');
      showToast(appError.userMessage, 'error');
      setSaveStatus('idle');
      return false;
    }
  }, [activeNote, loadNotes, showToast, t]);

  const deleteNoteById = useCallback(
    async (noteId: number) => {
      try {
        await deleteNote(noteId);
        await loadNotes();
      } catch (error) {
        const appError = handleError(error, 'db');
        showToast(appError.userMessage, 'error');
      }
    },
    [loadNotes, showToast]
  );

  const renameNote = useCallback(
    async (noteId: number, newTitle: string) => {
      try {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        await updateNote(noteId, { title: newTitle, updatedAt: new Date() });
        await loadNotes();
      } catch (error) {
        const appError = handleError(error, 'db');
        showToast(appError.userMessage, 'error');
      }
    },
    [notes, loadNotes, showToast]
  );

  const pinNote = useCallback(
    async (noteId: number) => {
      try {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        await updateNote(noteId, { isPinned: !note.isPinned, updatedAt: new Date() });
        await loadNotes();
      } catch (error) {
        const appError = handleError(error, 'db');
        showToast(appError.userMessage, 'error');
      }
    },
    [notes, loadNotes, showToast]
  );

  return {
    notes,
    setNotes,
    activeNote,
    setActiveNote,
    originalNoteContent,
    setOriginalNoteContent,
    saveStatus,
    setSaveStatus,
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
  };
};
