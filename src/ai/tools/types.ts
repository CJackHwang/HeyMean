/**
 * Tool system types for AI function calling
 * Supports both Gemini and OpenAI function calling formats
 */

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  requiredParams: string[];
}

export interface ToolCall {
  name: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type ToolExecutor = (params: Record<string, unknown>) => Promise<ToolResult>;

export interface ToolRegistryEntry {
  definition: ToolDefinition;
  executor: ToolExecutor;
}
