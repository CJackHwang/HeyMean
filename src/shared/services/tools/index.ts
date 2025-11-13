import { notesToolDefinitions, notesToolPrompt } from './notesTool';
import { ToolCall, ToolDefinition, ToolExecutionContext, ToolExecutionResult } from './types';

const TOOL_PROMPT_HEADER = '## Notes Tool Function Calls';

const registry = new Map<string, ToolDefinition>();
for (const definition of notesToolDefinitions) {
    registry.set(definition.name, definition);
}

const TOOL_BLOCK_REGEX = /<(tool_calls|function_calls)>((?:.|\n)*?)<\/\1>/gi;

const stripCodeFence = (payload: string): string => {
    const trimmed = payload.trim();
    if (!trimmed.startsWith('```')) {
        return trimmed;
    }
    const lines = trimmed.split('\n');
    if (lines.length <= 2) {
        return trimmed;
    }
    const fence = lines[0];
    if (!fence.startsWith('```')) {
        return trimmed;
    }
    const rest = lines.slice(1);
    const closingIndex = rest.lastIndexOf('```');
    if (closingIndex === -1) {
        return rest.join('\n').trim();
    }
    return rest.slice(0, closingIndex).join('\n').trim();
};

const normaliseToolCalls = (raw: unknown): ToolCall[] => {
    if (!raw) return [];
    const items: unknown[] = Array.isArray(raw) ? raw : [raw];
    const calls: ToolCall[] = [];

    for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const record = item as Record<string, unknown>;
        const name = record.name ?? record.tool ?? record.function;
        if (!name || typeof name !== 'string') continue;
        const args = record.arguments ?? record.args ?? record.parameters ?? record.params ?? {};
        calls.push({ name, arguments: args });
    }

    return calls;
};

const parseJsonPayload = (payload: string): ToolCall[] => {
    const clean = stripCodeFence(payload);
    if (!clean) return [];
    try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
            return normaliseToolCalls(parsed);
        }
        if (parsed && typeof parsed === 'object') {
            const record = parsed as Record<string, unknown>;
            if (Array.isArray(record.tool_calls)) {
                return normaliseToolCalls(record.tool_calls);
            }
            if ('name' in record) {
                return normaliseToolCalls(record);
            }
        }
    } catch (error) {
        console.warn('[tools] Failed to parse tool JSON payload:', error, payload);
    }
    return [];
};

export const parseToolCallsFromText = (text: string): ToolCall[] => {
    if (!text || typeof text !== 'string') return [];
    const calls: ToolCall[] = [];
    let match: RegExpExecArray | null;
    while ((match = TOOL_BLOCK_REGEX.exec(text)) !== null) {
        const payload = match[2];
        const parsedCalls = parseJsonPayload(payload);
        if (parsedCalls.length > 0) {
            calls.push(...parsedCalls);
        }
    }
    return calls;
};

export const executeToolCall = async (call: ToolCall, context?: ToolExecutionContext): Promise<ToolExecutionResult> => {
    const definition = registry.get(call.name);
    if (!definition) {
        return {
            name: call.name,
            success: false,
            error: { code: 'UNKNOWN_TOOL', message: `Tool "${call.name}" is not registered.` },
        };
    }

    try {
        return await definition.execute(call.arguments, context);
    } catch (error) {
        return {
            name: call.name,
            success: false,
            error: {
                code: 'EXECUTION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown tool execution error.',
            },
        };
    }
};

export const executeToolCalls = async (calls: ToolCall[], context?: ToolExecutionContext): Promise<ToolExecutionResult[]> => {
    const results: ToolExecutionResult[] = [];
    for (const call of calls) {
        const result = await executeToolCall(call, context);
        results.push(result);
    }
    return results;
};

export const executeToolCallsFromText = async (text: string, context?: ToolExecutionContext): Promise<ToolExecutionResult[]> => {
    const calls = parseToolCallsFromText(text);
    if (calls.length === 0) return [];
    return await executeToolCalls(calls, context);
};

export const injectToolInstructions = (existingPrompt: string): string => {
    const base = existingPrompt ?? '';
    if (base.includes(TOOL_PROMPT_HEADER)) {
        return base;
    }
    if (!base.trim()) {
        return notesToolPrompt;
    }
    return `${base.trim()}\n\n${notesToolPrompt.trim()}`;
};

export const getRegisteredTools = (): ToolDefinition[] => Array.from(registry.values());

export { ToolCall, ToolExecutionResult, ToolDefinition, ToolExecutionContext } from './types';
