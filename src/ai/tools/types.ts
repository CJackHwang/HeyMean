/**
 * AI Tools Type Definitions
 * Provides reusable tool interfaces for AI chat and agent workflows
 */

/**
 * Parameter definition for a tool
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: string[];
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
}

/**
 * Tool definition schema compatible with both Gemini and OpenAI
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

/**
 * Tool execution context passed to executor functions
 */
export interface ToolExecutionContext {
  // Can be extended with user info, permissions, etc.
  timestamp: Date;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Tool executor function signature
 */
export type ToolExecutor = (
  args: Record<string, any>,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

/**
 * Complete tool registration including definition and executor
 */
export interface Tool {
  definition: ToolDefinition;
  executor: ToolExecutor;
}

/**
 * Tool call request from AI
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/**
 * Tool call response to AI
 */
export interface ToolCallResponse {
  id: string;
  name: string;
  result: ToolExecutionResult;
}
