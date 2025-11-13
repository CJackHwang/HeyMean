import { Note } from '@shared/types';
import { createNote, getNoteById, getNoteByTitle, listNotes, updateNote } from '@shared/services/notes';
import { ToolDefinition, ToolExecutionResult, ToolExecutionContext } from './types';

const TOOL_SOURCE = 'ai-tool';

const ensureString = (value: unknown): string | undefined => {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return undefined;
};

const ensureBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lowered = value.toLowerCase();
        if (lowered === 'true') return true;
        if (lowered === 'false') return false;
    }
    return undefined;
};

const ensureNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return undefined;
};

const toIsoString = (value: Date | string): string => {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString();
    }
    return parsed.toISOString();
};

const createSnippet = (content: string, maxLength: number = 160): string => {
    const trimmed = content.trim();
    if (!trimmed) return '';
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength - 3)}...`;
};

const serialiseNote = (note: Note, options?: { includeContent?: boolean; snippetLength?: number }) => {
    const includeContent = options?.includeContent ?? true;
    const snippetLength = options?.snippetLength ?? 160;
    const content = note.content || '';
    return {
        id: note.id,
        title: note.title,
        content: includeContent ? content : undefined,
        snippet: createSnippet(content, snippetLength),
        isPinned: note.isPinned ?? false,
        createdAt: toIsoString(note.createdAt),
        updatedAt: toIsoString(note.updatedAt),
    };
};

const ok = (name: string, data: unknown): ToolExecutionResult => ({
    name,
    success: true,
    data,
});

const fail = (name: string, code: string, message: string): ToolExecutionResult => ({
    name,
    success: false,
    error: { code, message },
});

const getSource = (context?: ToolExecutionContext): string | undefined => {
    return context?.origin ?? TOOL_SOURCE;
};

const notesCreate: ToolDefinition = {
    name: 'notes.create',
    description: 'Create a new note with Markdown content. Optionally override the title or set the note as pinned.',
    parameters: [
        { key: 'content', type: 'string', description: 'Markdown content for the note. Required.', required: true },
        { key: 'title', type: 'string', description: 'Optional explicit title. If omitted, it will be derived from the content.' },
        { key: 'isPinned', type: 'boolean', description: 'Set to true to pin the note after creation.' },
    ],
    examples: [
        '<tool_calls>\n[{"name":"notes.create","arguments":{"content":"## 考试重点\n- 微积分\n- 线性代数","title":"复习笔记"}}]\n</tool_calls>',
    ],
    execute: async (args, context) => {
        const argumentsObject = (args && typeof args === 'object') ? (args as Record<string, unknown>) : {};
        const content = ensureString(argumentsObject.content);
        const title = ensureString(argumentsObject.title);
        const isPinned = ensureBoolean(argumentsObject.isPinned);

        if (!content || content.trim().length === 0) {
            return fail('notes.create', 'INVALID_ARGUMENT', 'The "content" field is required to create a note.');
        }

        try {
            const note = await createNote({
                title,
                content,
                isPinned,
                source: getSource(context),
            });
            return ok('notes.create', serialiseNote(note));
        } catch (error) {
            return fail('notes.create', 'EXECUTION_ERROR', error instanceof Error ? error.message : 'Failed to create note.');
        }
    },
};

const notesList: ToolDefinition = {
    name: 'notes.list',
    description: 'Retrieve the list of notes sorted by last update time. Supports pagination, pin filtering, and content snippets.',
    parameters: [
        { key: 'limit', type: 'number', description: 'Maximum number of notes to return. Defaults to 20.' },
        { key: 'pinnedOnly', type: 'boolean', description: 'If true, only pinned notes will be returned.' },
        { key: 'includeContent', type: 'boolean', description: 'Include full note content. Defaults to false (returns snippet only).' },
        { key: 'snippetLength', type: 'number', description: 'Max characters for the snippet preview. Defaults to 160.' },
    ],
    examples: [
        '<tool_calls>\n[{"name":"notes.list","arguments":{"pinnedOnly":true,"limit":5}}]\n</tool_calls>',
    ],
    execute: async (args) => {
        const argumentsObject = (args && typeof args === 'object') ? (args as Record<string, unknown>) : {};
        const limit = ensureNumber(argumentsObject.limit);
        const pinnedOnly = ensureBoolean(argumentsObject.pinnedOnly);
        const includeContent = ensureBoolean(argumentsObject.includeContent);
        const snippetLength = ensureNumber(argumentsObject.snippetLength);

        const effectiveLimit = limit && limit > 0 ? Math.min(Math.floor(limit), 100) : 20;
        const options = {
            limit: effectiveLimit,
            pinnedOnly: pinnedOnly === true,
            includeContent: includeContent === true,
            snippetLength: snippetLength && snippetLength > 0 ? Math.floor(snippetLength) : 160,
        };

        try {
            const notes = await listNotes(options);
            const serialised = notes.map((note) => serialiseNote(note, { includeContent: options.includeContent, snippetLength: options.snippetLength }));
            return ok('notes.list', serialised);
        } catch (error) {
            return fail('notes.list', 'EXECUTION_ERROR', error instanceof Error ? error.message : 'Failed to retrieve notes.');
        }
    },
};

const notesGet: ToolDefinition = {
    name: 'notes.get',
    description: 'Retrieve a single note by id or title.',
    parameters: [
        { key: 'id', type: 'number', description: 'Numeric identifier of the note. Provide either id or title.' },
        { key: 'title', type: 'string', description: 'Exact title match. Provide either title or id.' },
        { key: 'includeContent', type: 'boolean', description: 'Include full note content. Defaults to true.' },
        { key: 'snippetLength', type: 'number', description: 'Snippet length when includeContent is false. Defaults to 160.' },
    ],
    examples: [
        '<tool_calls>\n[{"name":"notes.get","arguments":{"id":12}}]\n</tool_calls>',
    ],
    execute: async (args) => {
        const argumentsObject = (args && typeof args === 'object') ? (args as Record<string, unknown>) : {};
        const id = ensureNumber(argumentsObject.id);
        const title = ensureString(argumentsObject.title);
        const includeContent = ensureBoolean(argumentsObject.includeContent);
        const snippetLength = ensureNumber(argumentsObject.snippetLength);

        if (!id && (!title || title.trim().length === 0)) {
            return fail('notes.get', 'INVALID_ARGUMENT', 'Provide either "id" or "title" to retrieve a note.');
        }

        try {
            let note: Note | undefined;
            if (id) {
                note = await getNoteById(id);
            } else if (title) {
                note = await getNoteByTitle(title);
            }

            if (!note) {
                return fail('notes.get', 'NOT_FOUND', 'The requested note could not be found.');
            }

            return ok('notes.get', serialiseNote(note, {
                includeContent: includeContent !== false,
                snippetLength: snippetLength && snippetLength > 0 ? Math.floor(snippetLength) : 160,
            }));
        } catch (error) {
            return fail('notes.get', 'EXECUTION_ERROR', error instanceof Error ? error.message : 'Failed to retrieve the note.');
        }
    },
};

const notesUpdate: ToolDefinition = {
    name: 'notes.update',
    description: 'Update an existing note. You can change its title, content, or pin state.',
    parameters: [
        { key: 'id', type: 'number', description: 'Identifier of the note to update.', required: true },
        { key: 'title', type: 'string', description: 'New title for the note.' },
        { key: 'content', type: 'string', description: 'Replace the note content with this Markdown.' },
        { key: 'isPinned', type: 'boolean', description: 'Set to true to pin the note or false to unpin.' },
    ],
    examples: [
        '<tool_calls>\n[{"name":"notes.update","arguments":{"id":7,"content":"重新整理后的课堂笔记"}}]\n</tool_calls>',
    ],
    execute: async (args, context) => {
        const argumentsObject = (args && typeof args === 'object') ? (args as Record<string, unknown>) : {};
        const id = ensureNumber(argumentsObject.id);
        const title = ensureString(argumentsObject.title);
        const content = ensureString(argumentsObject.content);
        const isPinned = ensureBoolean(argumentsObject.isPinned);

        if (!id) {
            return fail('notes.update', 'INVALID_ARGUMENT', 'The "id" field is required to update a note.');
        }

        if (title === undefined && content === undefined && isPinned === undefined) {
            return fail('notes.update', 'INVALID_ARGUMENT', 'Provide at least one field to update: title, content, or isPinned.');
        }

        try {
            const updated = await updateNote({
                id,
                title,
                content,
                isPinned,
                source: getSource(context),
            });

            if (!updated) {
                return fail('notes.update', 'NOT_FOUND', 'The note to update could not be found.');
            }

            return ok('notes.update', serialiseNote(updated));
        } catch (error) {
            return fail('notes.update', 'EXECUTION_ERROR', error instanceof Error ? error.message : 'Failed to update the note.');
        }
    },
};

export const notesToolDefinitions: ToolDefinition[] = [notesCreate, notesList, notesGet, notesUpdate];

export const notesToolPrompt = `## Notes Tool Function Calls\nYou can directly manage the user's study notes through the following tools.\nWhenever you need to call a tool, place a JSON array inside a <tool_calls>...</tool_calls> block within your <thinking> section.\nEach tool call object must contain:\n- "name": the tool name\n- "arguments": an object with the required fields\n\nAvailable tools:\n1. notes.create — Create a note. Required: content. Optional: title, isPinned.\n2. notes.list — List notes with optional filters: limit, pinnedOnly, includeContent, snippetLength.\n3. notes.get — Retrieve a single note by id or title.\n4. notes.update — Update the title, content, or pin state of an existing note.\n\nGuidelines:\n- Prefer concise snippets when listing notes. Use includeContent=true only when the full body is necessary.\n- After executing tool calls, continue reasoning and include the outcome in your final reply.\n- Never expose the raw JSON or the <tool_calls> block in the final answer.\n`;