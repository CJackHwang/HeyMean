import { ToolRegistryEntry, ToolDefinition, ToolExecutor } from './types';
import {
  createNoteTool,
  getNoteTool,
  listNotesTool,
  updateNoteTool,
  searchNotesTool,
  deleteNoteTool,
} from './schemas';
import {
  executeCreateNote,
  executeGetNote,
  executeListNotes,
  executeUpdateNote,
  executeSearchNotes,
  executeDeleteNote,
} from './executors';

/**
 * Tool registry that maps tool names to their definitions and executors
 */
class ToolRegistry {
  private tools: Map<string, ToolRegistryEntry> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Register default tools (note tools)
   */
  private registerDefaultTools(): void {
    this.register(createNoteTool, executeCreateNote);
    this.register(getNoteTool, executeGetNote);
    this.register(listNotesTool, executeListNotes);
    this.register(updateNoteTool, executeUpdateNote);
    this.register(searchNotesTool, executeSearchNotes);
    this.register(deleteNoteTool, executeDeleteNote);
  }

  /**
   * Register a tool with its definition and executor
   */
  register(definition: ToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.name, { definition, executor });
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolRegistryEntry | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tool definitions
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((entry) => entry.definition);
  }

  /**
   * Get all registered tool names
   */
  getAllNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get the executor for a tool
   */
  getExecutor(name: string): ToolExecutor | undefined {
    return this.tools.get(name)?.executor;
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
