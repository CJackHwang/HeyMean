/**
 * Notes Tool Definitions
 * Schema definitions for note-related AI tools
 */

import type { ToolDefinition } from '../types';

/**
 * Tool: Create a new note
 */
export const createNoteToolDefinition: ToolDefinition = {
  name: 'createNote',
  description: 'Create a new note with a title and content. Use this when the user asks to save information, create a note, or remember something.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title of the note. Should be concise and descriptive.',
      },
      content: {
        type: 'string',
        description: 'The content of the note. Can be empty if only title is needed.',
      },
    },
    required: ['title'],
  },
};

/**
 * Tool: Read a specific note by ID
 */
export const readNoteToolDefinition: ToolDefinition = {
  name: 'readNote',
  description: 'Read the content of a specific note by its ID. Use this when you need to retrieve or review a previously saved note.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The ID of the note to read.',
      },
    },
    required: ['id'],
  },
};

/**
 * Tool: List all notes
 */
export const listNotesToolDefinition: ToolDefinition = {
  name: 'listNotes',
  description: 'List all available notes with their IDs, titles, and metadata. Use this to see what notes exist or to find a specific note.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of notes to return. Default is 50.',
      },
    },
    required: [],
  },
};

/**
 * Tool: Update an existing note
 */
export const updateNoteToolDefinition: ToolDefinition = {
  name: 'updateNote',
  description: 'Update an existing note by its ID. Can update title, content, or both. Use this when the user wants to modify or append to an existing note.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'The ID of the note to update.',
      },
      title: {
        type: 'string',
        description: 'The new title for the note. If not provided, title remains unchanged.',
      },
      content: {
        type: 'string',
        description: 'The new content for the note. If not provided, content remains unchanged.',
      },
    },
    required: ['id'],
  },
};

/**
 * All notes tool definitions
 */
export const notesToolDefinitions = [
  createNoteToolDefinition,
  readNoteToolDefinition,
  listNotesToolDefinition,
  updateNoteToolDefinition,
];
