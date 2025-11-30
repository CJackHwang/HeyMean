import { useState, useRef, useCallback } from 'react';
import { Note } from '@shared/types';
import { getNotes, addNote, updateNote, deleteNote } from '@shared/services/db';
import { getPayload, clearPayload } from '@shared/lib/preloadPayload';
import { useToast } from '@app/providers/useToast';
import { handleError } from '@shared/services/errorHandler';

export const useNoteActions = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [originalNoteContent, setOriginalNoteContent] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isNewNote, setIsNewNote] = useState(false);
  const { showToast } = useToast();
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

  const createNewNote = useCallback(() => {
    const now = new Date();
    const newNote: Note = {
      id: Date.now(),
      title: 'New Note',
      content: '',
      createdAt: now,
      updatedAt: now,
      isPinned: false,
    };
    setActiveNote(newNote);
    setOriginalNoteContent('');
    setIsNewNote(true);
  }, []);

  const saveNote = useCallback(async () => {
    if (!activeNote) return;

    setSaveStatus('saving');
    try {
      const [title, ...rest] = activeNote.content.split('\n');
      const trimmedTitle = title.trim() || 'New Note';
      const content = rest.join('\n');
      const noteToSave = { ...activeNote, title: trimmedTitle, content, updatedAt: new Date() };

      if (isNewNote) {
        const addedNote = await addNote(noteToSave.title, noteToSave.content);
        await loadNotes();
        setActiveNote(addedNote);
        setOriginalNoteContent(addedNote.content);
        setIsNewNote(false);
      } else {
        await updateNote(noteToSave.id, {
          title: noteToSave.title,
          content: noteToSave.content,
          updatedAt: noteToSave.updatedAt,
        });
        await loadNotes();
        setActiveNote(noteToSave);
        setOriginalNoteContent(noteToSave.content);
      }

      setSaveStatus('saved');
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
  }, [activeNote, isNewNote, loadNotes, showToast]);

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
