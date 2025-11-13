import { ToolDefinition } from '../types';

/**
 * Create a new note with title and content
 */
export const createNoteTool: ToolDefinition = {
  name: 'createNote',
  description: 'Create a new note with title and content. Use this when the user asks to save, create, or write a note.',
  parameters: {
    title: {
      type: 'string',
      description: 'The title of the note',
      required: true,
    },
    content: {
      type: 'string',
      description: 'The content of the note',
      required: true,
    },
  },
  requiredParams: ['title', 'content'],
};

/**
 * Get a specific note by ID
 */
export const getNoteTool: ToolDefinition = {
  name: 'getNote',
  description: 'Get a specific note by its ID. Use this when the user asks to view, show, or retrieve a specific note.',
  parameters: {
    id: {
      type: 'number',
      description: 'The ID of the note to retrieve',
      required: true,
    },
  },
  requiredParams: ['id'],
};

/**
 * List all notes or get notes with pagination
 */
export const listNotesTool: ToolDefinition = {
  name: 'listNotes',
  description: 'List all notes or get notes with pagination. Use this when the user asks to see all notes, list notes, or browse their notes. Returns notes sorted by update time (most recent first), with pinned notes at the top.',
  parameters: {
    limit: {
      type: 'number',
      description: 'Maximum number of notes to return (optional, default: all notes)',
      required: false,
    },
    offset: {
      type: 'number',
      description: 'Number of notes to skip for pagination (optional, default: 0)',
      required: false,
    },
  },
  requiredParams: [],
};

/**
 * Update an existing note
 */
export const updateNoteTool: ToolDefinition = {
  name: 'updateNote',
  description: 'Update an existing note by ID. You can update the title, content, or both. Use this when the user asks to edit, modify, or change a note.',
  parameters: {
    id: {
      type: 'number',
      description: 'The ID of the note to update',
      required: true,
    },
    title: {
      type: 'string',
      description: 'The new title for the note (optional)',
      required: false,
    },
    content: {
      type: 'string',
      description: 'The new content for the note (optional)',
      required: false,
    },
  },
  requiredParams: ['id'],
};

/**
 * Search notes by content or title
 */
export const searchNotesTool: ToolDefinition = {
  name: 'searchNotes',
  description: 'Search notes by matching query against title and content. Use this when the user asks to find or search for notes containing specific text.',
  parameters: {
    query: {
      type: 'string',
      description: 'The search query to match against note titles and content',
      required: true,
    },
  },
  requiredParams: ['query'],
};

/**
 * Delete a note by ID
 */
export const deleteNoteTool: ToolDefinition = {
  name: 'deleteNote',
  description: 'Delete a note by its ID. Use this when the user asks to delete, remove, or discard a note.',
  parameters: {
    id: {
      type: 'number',
      description: 'The ID of the note to delete',
      required: true,
    },
  },
  requiredParams: ['id'],
};
