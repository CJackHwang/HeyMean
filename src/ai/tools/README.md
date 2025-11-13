# AI Tools System

This directory contains the tool system for AI function calling capabilities.

## Architecture

```
tools/
  ├── types.ts          # Core type definitions for tools
  ├── registry.ts       # Tool registry for managing available tools
  ├── schemas/          # Tool schema definitions
  │   ├── noteTools.ts  # Note management tool schemas
  │   └── index.ts
  ├── executors/        # Tool execution implementations
  │   ├── noteTools.ts  # Note management tool executors
  │   └── index.ts
  └── README.md
```

## Available Tools

### Note Tools

- **createNote**: Create a new note with title and content
- **getNote**: Get a specific note by ID
- **listNotes**: List all notes or get notes with pagination
- **updateNote**: Update an existing note
- **searchNotes**: Search notes by content or title
- **deleteNote**: Delete a note by ID

## Usage

### For Chat Features

```typescript
import { getToolsForProvider, executeTool } from '@shared/services/toolService';
import { ApiProvider } from '@shared/types';

// Get tools formatted for specific provider
const geminiTools = getToolsForProvider(ApiProvider.GEMINI);
const openaiTools = getToolsForProvider(ApiProvider.OPENAI);

// Execute a tool
const result = await executeTool({
  name: 'createNote',
  parameters: {
    title: 'My Note',
    content: 'Note content here'
  }
});
```

### For Agent Workflows (Future)

```typescript
import { toolRegistry } from '@ai/tools/registry';

// Get all available tools
const tools = toolRegistry.getAllDefinitions();

// Execute tool by name
const executor = toolRegistry.getExecutor('createNote');
if (executor) {
  const result = await executor({ title: 'Title', content: 'Content' });
}
```

## Adding New Tools

1. Define tool schema in `schemas/`:

```typescript
export const myTool: ToolDefinition = {
  name: 'myTool',
  description: 'Description of what the tool does',
  parameters: {
    param1: {
      type: 'string',
      description: 'Parameter description',
      required: true,
    },
  },
  requiredParams: ['param1'],
};
```

2. Implement executor in `executors/`:

```typescript
export const executeMyTool: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    // Implementation here
    return {
      success: true,
      data: { /* result data */ }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error message'
    };
  }
};
```

3. Register in `registry.ts`:

```typescript
this.register(myTool, executeMyTool);
```

## Provider Format Conversion

The tool service automatically converts tool definitions to the format required by each AI provider:

- **Gemini**: Uses `FunctionDeclaration` format with `functionDeclarations` array
- **OpenAI**: Uses `FunctionDefinition` format with `tools` array

## Reusability

This tool system is designed to be reusable across:

- **Chat features**: Current implementation for AI chat with function calling
- **Agent workflows**: Future implementation for autonomous agents
- **Custom integrations**: Any other feature that needs tool execution

The `toolService` in `shared/services/` provides a unified interface that abstracts provider-specific details.
