/**
 * Tool Registry
 * Central registry for all AI tools with reusable interface for chat and agents
 */

import type { Tool, ToolDefinition, ToolExecutor, ToolExecutionContext, ToolExecutionResult } from './types';
import {
  notesToolDefinitions,
  notesToolExecutors,
} from './notes';

/**
 * Tool Registry class for managing and executing AI tools
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool with its definition and executor
   */
  register(definition: ToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.name, { definition, executor });
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tool definitions
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  /**
   * Execute a tool by name with given arguments
   */
  async execute(
    name: string,
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found in registry`,
      };
    }

    try {
      return await tool.executor(args, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to execute tool "${name}"`,
      };
    }
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get count of registered tools
   */
  get size(): number {
    return this.tools.size;
  }
}

/**
 * Default tool registry instance with all available tools
 */
export const defaultToolRegistry = new ToolRegistry();

// Register notes tools
notesToolDefinitions.forEach((definition, index) => {
  const executorKey = definition.name as keyof typeof notesToolExecutors;
  const executor = notesToolExecutors[executorKey];
  if (executor) {
    defaultToolRegistry.register(definition, executor);
  }
});

/**
 * Helper function to create a tool execution context
 */
export const createToolContext = (): ToolExecutionContext => ({
  timestamp: new Date(),
});
