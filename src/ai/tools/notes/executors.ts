/**
 * Notes Tool Executors
 * Implementation of note-related tool execution functions
 */

import { addNote, getNotes, updateNote as updateNoteDb } from '@shared/services/db';
import type { ToolExecutor, ToolExecutionResult } from '../types';

/**
 * Executor: Create a new note
 */
export const createNoteExecutor: ToolExecutor = async (args, context): Promise<ToolExecutionResult> => {
  try {
    const { title, content = '' } = args;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return {
        success: false,
        error: 'Title is required and must be a non-empty string',
      };
    }

    const note = await addNote(title.trim(), content);
    
    return {
      success: true,
      data: {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        message: `Note "${note.title}" created successfully with ID ${note.id}`,
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
 * Executor: Read a specific note by ID
 */
export const readNoteExecutor: ToolExecutor = async (args, context): Promise<ToolExecutionResult> => {
  try {
    const { id } = args;
    
    if (typeof id !== 'number') {
      return {
        success: false,
        error: 'Note ID must be a number',
      };
    }

    const notes = await getNotes();
    const note = notes.find(n => n.id === id);
    
    if (!note) {
      return {
        success: false,
        error: `Note with ID ${id} not found`,
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
      error: error instanceof Error ? error.message : 'Failed to read note',
    };
  }
};

/**
 * Executor: List all notes
 */
export const listNotesExecutor: ToolExecutor = async (args, context): Promise<ToolExecutionResult> => {
  try {
    const { limit = 50 } = args;
    
    const notes = await getNotes();
    const limitedNotes = notes.slice(0, limit);
    
    return {
      success: true,
      data: {
        notes: limitedNotes.map(note => ({
          id: note.id,
          title: note.title,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          isPinned: note.isPinned,
          contentPreview: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
        })),
        total: notes.length,
        returned: limitedNotes.length,
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
 * Executor: Update an existing note
 */
export const updateNoteExecutor: ToolExecutor = async (args, context): Promise<ToolExecutionResult> => {
  try {
    const { id, title, content } = args;
    
    if (typeof id !== 'number') {
      return {
        success: false,
        error: 'Note ID must be a number',
      };
    }

    if (!title && !content) {
      return {
        success: false,
        error: 'At least one of title or content must be provided to update',
      };
    }

    // Check if note exists
    const notes = await getNotes();
    const existingNote = notes.find(n => n.id === id);
    
    if (!existingNote) {
      return {
        success: false,
        error: `Note with ID ${id} not found`,
      };
    }

    // Prepare update object
    const updates: { title?: string; content?: string } = {};
    if (title !== undefined && typeof title === 'string') {
      updates.title = title.trim();
    }
    if (content !== undefined && typeof content === 'string') {
      updates.content = content;
    }

    await updateNoteDb(id, updates);
    
    // Get updated note
    const updatedNotes = await getNotes();
    const updatedNote = updatedNotes.find(n => n.id === id);
    
    return {
      success: true,
      data: {
        id: updatedNote!.id,
        title: updatedNote!.title,
        content: updatedNote!.content,
        updatedAt: updatedNote!.updatedAt.toISOString(),
        message: `Note "${updatedNote!.title}" updated successfully`,
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
 * All notes tool executors mapped by name
 */
export const notesToolExecutors = {
  createNote: createNoteExecutor,
  readNote: readNoteExecutor,
  listNotes: listNotesExecutor,
  updateNote: updateNoteExecutor,
};
