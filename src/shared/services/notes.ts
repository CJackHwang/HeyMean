import { Note, NoteUpdate } from '@shared/types';
import { addNote, getNotes, getNoteById as getDbNoteById, updateNote as updateDbNote, deleteNote as deleteDbNote } from './db';

export const NOTES_CHANGED_EVENT = 'hm:notes-sync';

export type NotesChangeEventDetail =
    | { type: 'created'; note: Note; source?: string }
    | { type: 'updated'; note: Note; source?: string }
    | { type: 'deleted'; noteId: number; source?: string }
    | { type: 'refreshed'; source?: string };

const dispatchNotesChange = (detail: NotesChangeEventDetail) => {
    try {
        window.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT, { detail }));
    } catch {
        // ignore when window is not available (e.g., server-side)
    }
};

export interface ListNotesOptions {
    pinnedOnly?: boolean;
    limit?: number;
    includeContent?: boolean;
    snippetLength?: number;
}

export interface CreateNoteOptions {
    title?: string;
    content?: string;
    isPinned?: boolean;
    source?: string;
}

export interface UpdateNoteOptions {
    id: number;
    title?: string | null;
    content?: string | null;
    isPinned?: boolean | null;
    source?: string;
}

export interface DeleteNoteOptions {
    id: number;
    source?: string;
}

const deriveTitleFromContent = (content: string): string => {
    const lines = content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) return 'New Note';
    const firstLine = lines[0];
    if (firstLine.length <= 80) return firstLine;
    return `${firstLine.slice(0, 77)}...`;
};

const sanitiseContent = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/\r\n/g, '\n');
};

const sanitiseTitle = (value: unknown, fallbackContent: string): string => {
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim().slice(0, 120);
    }
    return deriveTitleFromContent(fallbackContent);
};

export const listNotes = async (options: ListNotesOptions = {}): Promise<Note[]> => {
    const all = await getNotes();
    let filtered = options.pinnedOnly ? all.filter((note) => note.isPinned) : all;
    if (typeof options.limit === 'number' && options.limit > 0) {
        filtered = filtered.slice(0, options.limit);
    }
    return filtered;
};

export const getNoteById = async (id: number): Promise<Note | undefined> => {
    if (!Number.isFinite(id)) return undefined;
    return await getDbNoteById(id);
};

export const getNoteByTitle = async (title: string): Promise<Note | undefined> => {
    if (typeof title !== 'string' || title.trim().length === 0) return undefined;
    const trimmed = title.trim().toLowerCase();
    const notes = await getNotes();
    return notes.find((note) => note.title.trim().toLowerCase() === trimmed);
};

export const createNote = async ({ title, content, isPinned, source }: CreateNoteOptions = {}): Promise<Note> => {
    const normalisedContent = sanitiseContent(content);
    const normalisedTitle = sanitiseTitle(title, normalisedContent);
    const note = await addNote(normalisedTitle, normalisedContent, Boolean(isPinned));
    dispatchNotesChange({ type: 'created', note, source });
    return note;
};

export const updateNote = async ({ id, title, content, isPinned, source }: UpdateNoteOptions): Promise<Note | undefined> => {
    if (!Number.isFinite(id)) return undefined;
    const updates: NoteUpdate = {};
    let contentChanged = false;

    if (typeof content === 'string') {
        updates.content = sanitiseContent(content);
        contentChanged = true;
    }
    if (title !== undefined) {
        const contentForTitle = typeof updates.content === 'string' ? updates.content : (await getDbNoteById(id))?.content || '';
        updates.title = sanitiseTitle(title, contentForTitle);
    }
    if (typeof isPinned === 'boolean') {
        updates.isPinned = isPinned;
    }

    if (Object.keys(updates).length === 0) {
        return await getDbNoteById(id);
    }

    await updateDbNote(id, updates);
    const updated = await getDbNoteById(id);
    if (updated) {
        // When only content changes, ensure title fallback stays in sync
        if (!updates.title && contentChanged && (!updated.title || updated.title === 'New Note')) {
            const derivedTitle = sanitiseTitle(title, updated.content);
            if (derivedTitle !== updated.title) {
                await updateDbNote(id, { title: derivedTitle });
                const reloaded = await getDbNoteById(id);
                if (reloaded) {
                    dispatchNotesChange({ type: 'updated', note: reloaded, source });
                    return reloaded;
                }
            }
        }
        dispatchNotesChange({ type: 'updated', note: updated, source });
    }
    return updated;
};

export const deleteNote = async ({ id, source }: DeleteNoteOptions): Promise<void> => {
    if (!Number.isFinite(id)) return;
    await deleteDbNote(id);
    dispatchNotesChange({ type: 'deleted', noteId: id, source });
};

export const refreshNotes = (source?: string) => {
    dispatchNotesChange({ type: 'refreshed', source });
};
