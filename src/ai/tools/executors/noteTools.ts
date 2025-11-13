import { ToolExecutor, ToolResult } from '../types';
import { getNotes, addNote, updateNote as dbUpdateNote, deleteNote as dbDeleteNote } from '@shared/services/db';

const dispatchNotesChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hm:notes-changed'));
  }
};

/**
 * Execute createNote tool
 */
export const executeCreateNote: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const title = params.title as string;
    const content = params.content as string;

    if (!title || typeof title !== 'string') {
      return {
        success: false,
        error: 'Invalid or missing title parameter',
      };
    }

    if (!content || typeof content !== 'string') {
      return {
        success: false,
        error: 'Invalid or missing content parameter',
      };
    }

    const newNote = await addNote(title, content);
    dispatchNotesChanged();
    return {
      success: true,
      data: {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        createdAt: newNote.createdAt.toISOString(),
        updatedAt: newNote.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create note',
    };
  }
};

/**
 * Execute getNote tool
 */
export const executeGetNote: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const id = params.id as number;

    if (typeof id !== 'number') {
      return {
        success: false,
        error: 'Invalid or missing id parameter',
      };
    }

    const notes = await getNotes();
    const note = notes.find((n) => n.id === id);

    if (!note) {
      return {
        success: false,
        error: `Note with id ${id} not found`,
      };
    }

    return {
      success: true,
      data: {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        isPinned: note.isPinned,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get note',
    };
  }
};

/**
 * Execute listNotes tool
 */
export const executeListNotes: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const limit = params.limit as number | undefined;
    const offset = params.offset as number | undefined;

    const notes = await getNotes();
    
    let resultNotes = notes;
    if (typeof offset === 'number' && offset > 0) {
      resultNotes = resultNotes.slice(offset);
    }
    if (typeof limit === 'number' && limit > 0) {
      resultNotes = resultNotes.slice(0, limit);
    }

    return {
      success: true,
      data: {
        notes: resultNotes.map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          isPinned: note.isPinned,
        })),
        total: notes.length,
        returned: resultNotes.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list notes',
    };
  }
};

/**
 * Execute updateNote tool
 */
export const executeUpdateNote: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const id = params.id as number;
    const title = params.title as string | undefined;
    const content = params.content as string | undefined;

    if (typeof id !== 'number') {
      return {
        success: false,
        error: 'Invalid or missing id parameter',
      };
    }

    if (!title && !content) {
      return {
        success: false,
        error: 'At least one of title or content must be provided',
      };
    }

    const updates: { title?: string; content?: string } = {};
    if (title !== undefined) {
      updates.title = title;
    }
    if (content !== undefined) {
      updates.content = content;
    }

    await dbUpdateNote(id, updates);
    dispatchNotesChanged();

    // Retrieve updated note
    const notes = await getNotes();
    const updatedNote = notes.find((n) => n.id === id);

    if (!updatedNote) {
      return {
        success: false,
        error: `Note with id ${id} not found after update`,
      };
    }

    return {
      success: true,
      data: {
        id: updatedNote.id,
        title: updatedNote.title,
        content: updatedNote.content,
        createdAt: updatedNote.createdAt.toISOString(),
        updatedAt: updatedNote.updatedAt.toISOString(),
        isPinned: updatedNote.isPinned,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update note',
    };
  }
};

/**
 * Execute searchNotes tool
 */
export const executeSearchNotes: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const query = params.query as string;

    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: 'Invalid or missing query parameter',
      };
    }

    const notes = await getNotes();
    const lowerQuery = query.toLowerCase();
    
    const matchedNotes = notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(lowerQuery);
      const contentMatch = note.content.toLowerCase().includes(lowerQuery);
      return titleMatch || contentMatch;
    });

    return {
      success: true,
      data: {
        notes: matchedNotes.map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          isPinned: note.isPinned,
        })),
        query,
        found: matchedNotes.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search notes',
    };
  }
};

/**
 * Execute deleteNote tool
 */
export const executeDeleteNote: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const id = params.id as number;

    if (typeof id !== 'number') {
      return {
        success: false,
        error: 'Invalid or missing id parameter',
      };
    }

    await dbDeleteNote(id);
    dispatchNotesChanged();

    return {
      success: true,
      data: {
        id,
        message: 'Note deleted successfully',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete note',
    };
  }
};
