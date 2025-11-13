/**
 * Tool Service - Unified interface for tool calling in chat and agent workflows
 * 
 * This service provides a reusable interface that can be used by:
 * - Chat features (current implementation)
 * - Future agent workflows
 * 
 * It handles tool definition conversion for different AI providers (Gemini, OpenAI)
 * and tool execution.
 */

import { toolRegistry } from '@ai/tools/registry';
import { ToolDefinition, ToolCall, ToolResult, ToolParameter } from '@ai/tools/types';
import { ApiProvider } from '@shared/types';

/**
 * Gemini function declaration format
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * OpenAI function definition format
 */
export interface OpenAIFunctionDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Convert parameter to API format
 */
const convertParameter = (param: ToolParameter): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    type:
      param.type === 'number'
        ? 'number'
        : param.type === 'boolean'
          ? 'boolean'
          : param.type === 'array'
            ? 'array'
            : param.type === 'object'
              ? 'object'
              : 'string',
    description: param.description,
  };

  if (param.enum) {
    base.enum = param.enum;
  }
  if (param.items) {
    base.items = convertParameter(param.items);
  }
  if (param.properties) {
    const nested: Record<string, unknown> = {};
    for (const [nestedKey, nestedParam] of Object.entries(param.properties)) {
      nested[nestedKey] = convertParameter(nestedParam);
    }
    base.properties = nested;
  }

  return base;
};

/**
 * Convert tool definition to Gemini function declaration
 */
export const toGeminiFunctionDeclaration = (tool: ToolDefinition): GeminiFunctionDeclaration => {
  const properties: Record<string, unknown> = {};

  for (const [key, param] of Object.entries(tool.parameters)) {
    properties[key] = convertParameter(param);
  }

  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties,
      required: tool.requiredParams,
    },
  };
};

/**
 * Convert tool definition to OpenAI function definition
 */
export const toOpenAIFunctionDefinition = (tool: ToolDefinition): OpenAIFunctionDefinition => {
  const properties: Record<string, unknown> = {};

  for (const [key, param] of Object.entries(tool.parameters)) {
    properties[key] = convertParameter(param);
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required: tool.requiredParams,
      },
    },
  };
};

/**
 * Get all tools in format suitable for specific provider
 */
export const getToolsForProvider = (
  provider: ApiProvider
): GeminiFunctionDeclaration[] | OpenAIFunctionDefinition[] => {
  const definitions = toolRegistry.getAllDefinitions();
  
  if (provider === ApiProvider.GEMINI) {
    return definitions.map(toGeminiFunctionDeclaration);
  } else {
    return definitions.map(toOpenAIFunctionDefinition);
  }
};

/**
 * Execute a tool call
 */
export const executeTool = async (toolCall: ToolCall): Promise<ToolResult> => {
  const executor = toolRegistry.getExecutor(toolCall.name);
  
  if (!executor) {
    return {
      success: false,
      error: `Tool '${toolCall.name}' not found in registry`,
    };
  }

  try {
    return await executor(toolCall.parameters);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error executing tool',
    };
  }
};

/**
 * Execute multiple tool calls in sequence
 */
export const executeToolsSequentially = async (toolCalls: ToolCall[]): Promise<ToolResult[]> => {
  const results: ToolResult[] = [];
  
  for (const toolCall of toolCalls) {
    const result = await executeTool(toolCall);
    results.push(result);
  }
  
  return results;
};

/**
 * Execute multiple tool calls in parallel
 */
export const executeToolsParallel = async (toolCalls: ToolCall[]): Promise<ToolResult[]> => {
  return await Promise.all(toolCalls.map(executeTool));
};

/**
 * Check if tools are available for a provider
 */
export const hasToolsForProvider = (provider: ApiProvider): boolean => {
  return toolRegistry.getAllDefinitions().length > 0;
};

/**
 * Get tool names available
 */
export const getAvailableToolNames = (): string[] => {
  return toolRegistry.getAllNames();
};

/**
 * Format tool result for display in markdown
 */
export const formatToolResult = (toolName: string, result: ToolResult): string => {
  if (result.success) {
    return `\n\n✅ **Tool Executed**: \`${toolName}\`\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\`\n`;
  } else {
    return `\n\n❌ **Tool Execution Failed**: \`${toolName}\`\nError: ${result.error}\n`;
  }
};
