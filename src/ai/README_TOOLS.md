# AI Tools API Documentation

This document describes the AI tools functionality that enables AI chat and future agent workflows to call functions for note management and other operations.

## Overview

The AI tools system provides:
- **Tool Definitions**: Declarative schemas describing available functions
- **Tool Executors**: Implementation of tool functions
- **Tool Registry**: Central registry for managing tools
- **Provider Adapters**: Automatic conversion to Gemini and OpenAI formats
- **Reusable API**: Same interface for chat and agent workflows

## Architecture

```
src/ai/tools/
├── types.ts              # Core type definitions
├── registry.ts           # Tool registry and management
├── adapters.ts           # Provider-specific format adapters
├── notes/
│   ├── definitions.ts    # Notes tool schemas
│   ├── executors.ts      # Notes tool implementations
│   └── index.ts
└── index.ts              # Main export
```

## Available Tools

### Note Management Tools

#### 1. createNote
Creates a new note with a title and content.

**Parameters:**
- `title` (string, required): The title of the note
- `content` (string, optional): The content of the note

**Returns:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "My Note",
    "content": "Note content",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "message": "Note \"My Note\" created successfully with ID 123"
  }
}
```

#### 2. readNote
Reads a specific note by its ID.

**Parameters:**
- `id` (number, required): The ID of the note to read

**Returns:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "My Note",
    "content": "Note content",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "isPinned": false
  }
}
```

#### 3. listNotes
Lists all available notes with metadata.

**Parameters:**
- `limit` (number, optional): Maximum number of notes to return (default: 50)

**Returns:**
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": 123,
        "title": "My Note",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "isPinned": false,
        "contentPreview": "First 100 chars of content..."
      }
    ],
    "total": 10,
    "returned": 10
  }
}
```

#### 4. updateNote
Updates an existing note by its ID.

**Parameters:**
- `id` (number, required): The ID of the note to update
- `title` (string, optional): New title for the note
- `content` (string, optional): New content for the note

**Returns:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Updated Note",
    "content": "Updated content",
    "updatedAt": "2024-01-01T01:00:00.000Z",
    "message": "Note \"Updated Note\" updated successfully"
  }
}
```

## Usage

### In Chat (Already Integrated)

Tools are automatically available in chat when configured in `apiService.ts`. The default tool registry includes all note management tools.

```typescript
import { streamChatResponse } from '@shared/services/apiService';
import { defaultToolRegistry } from '@ai/tools';

// Tools are automatically passed to the API
const result = await streamChatResponse(
  chatHistory,
  userMessage,
  {
    ...config,
    tools: defaultToolRegistry.getAllDefinitions(), // Optional, uses default if not provided
    toolRegistry: defaultToolRegistry, // Optional, uses default if not provided
  },
  onChunk,
  signal
);
```

### For Future Agent Workflows

The same tool registry can be reused for agent workflows:

```typescript
import { defaultToolRegistry, createToolContext } from '@ai/tools';

// Execute a tool directly
const context = createToolContext();
const result = await defaultToolRegistry.execute(
  'createNote',
  { title: 'Agent Note', content: 'Created by agent' },
  context
);

if (result.success) {
  console.log('Note created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Creating Custom Tools

To add new tools:

1. **Define the tool schema:**

```typescript
// src/ai/tools/custom/definitions.ts
import type { ToolDefinition } from '@ai/tools/types';

export const myToolDefinition: ToolDefinition = {
  name: 'myTool',
  description: 'Description of what this tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Description of param1',
      },
    },
    required: ['param1'],
  },
};
```

2. **Implement the executor:**

```typescript
// src/ai/tools/custom/executors.ts
import type { ToolExecutor } from '@ai/tools/types';

export const myToolExecutor: ToolExecutor = async (args, context) => {
  try {
    const { param1 } = args;
    
    // Implement your tool logic here
    const result = await doSomething(param1);
    
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
```

3. **Register the tool:**

```typescript
// Register in defaultToolRegistry or create a custom registry
import { defaultToolRegistry } from '@ai/tools/registry';
import { myToolDefinition } from './custom/definitions';
import { myToolExecutor } from './custom/executors';

defaultToolRegistry.register(myToolDefinition, myToolExecutor);
```

### Custom Tool Registry

For specific workflows, create a custom registry:

```typescript
import { ToolRegistry } from '@ai/tools/registry';
import { myToolDefinition, myToolExecutor } from './custom';

const customRegistry = new ToolRegistry();
customRegistry.register(myToolDefinition, myToolExecutor);

// Use in API calls
const result = await streamChatResponse(
  chatHistory,
  userMessage,
  {
    ...config,
    tools: customRegistry.getAllDefinitions(),
    toolRegistry: customRegistry,
  },
  onChunk,
  signal
);
```

## Provider Support

The tools system supports both Gemini and OpenAI providers:

- **Gemini**: Uses native function calling with `functionDeclarations`
- **OpenAI**: Uses standard function calling with `tools` array

The adapters automatically convert tool definitions to the correct format for each provider.

## Error Handling

All tool executors return a consistent result format:

```typescript
interface ToolExecutionResult {
  success: boolean;
  data?: any;        // Present when success is true
  error?: string;    // Present when success is false
}
```

This allows the AI to understand and handle errors gracefully.

## Future Extensions

The tool system is designed to support future enhancements:

- **Permissions**: Add permission checks in the execution context
- **Rate Limiting**: Implement rate limiting per tool or user
- **Logging**: Add comprehensive logging and analytics
- **Validation**: Add JSON schema validation for tool parameters
- **Versioning**: Support multiple versions of the same tool
- **Tool Discovery**: Dynamic tool discovery and registration
- **Agent Workflows**: Use tools in autonomous agent workflows
- **Multi-step Operations**: Chain multiple tool calls together
- **Tool Orchestration**: Coordinate complex multi-tool operations

## Best Practices

1. **Tool Naming**: Use clear, descriptive names (camelCase)
2. **Descriptions**: Provide detailed descriptions for AI understanding
3. **Error Messages**: Return user-friendly error messages
4. **Validation**: Validate all inputs in the executor
5. **Idempotency**: Make tools idempotent when possible
6. **Context**: Use execution context for user info, timestamps, etc.
7. **Async**: All executors should be async
8. **Type Safety**: Use TypeScript types throughout
