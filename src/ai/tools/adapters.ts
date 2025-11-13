/**
 * Tool Adapters
 * Convert tool definitions to provider-specific formats (Gemini, OpenAI)
 */

import type { ToolDefinition } from './types';

/**
 * Gemini tool format (uses SDK types directly)
 * We use 'any' here because we're creating objects that will be passed to the SDK
 * The SDK has its own internal type checking
 */
export type GeminiTool = any;

/**
 * OpenAI function format
 */
export interface OpenAIFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Convert our tool definition to Gemini format
 */
export const toGeminiFunctionDeclaration = (tool: ToolDefinition): any => {
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'OBJECT',
      properties: tool.parameters.properties,
      required: tool.parameters.required || [],
    },
  };
};

/**
 * Convert multiple tool definitions to Gemini tools format
 */
export const toGeminiTools = (tools: ToolDefinition[]): GeminiTool[] => {
  if (tools.length === 0) return [];
  
  return [{
    functionDeclarations: tools.map(toGeminiFunctionDeclaration),
  }];
};

/**
 * Convert our tool definition to OpenAI format
 */
export const toOpenAIFunction = (tool: ToolDefinition): OpenAIFunction => {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: tool.parameters.type,
        properties: tool.parameters.properties,
        required: tool.parameters.required || [],
      },
    },
  };
};

/**
 * Convert multiple tool definitions to OpenAI tools format
 */
export const toOpenAITools = (tools: ToolDefinition[]): OpenAIFunction[] => {
  return tools.map(toOpenAIFunction);
};
