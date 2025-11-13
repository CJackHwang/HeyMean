# AI Tools Usage Guide

This guide explains how to use the AI tools system in your application.

## Quick Start

The tool system is fully set up and ready to use. Tools are automatically registered and available through the `toolService`.

### For Chat Integration (Current Use Case)

The tools are exposed through `shared/services/toolService` which provides a unified interface:

```typescript
import { 
  getToolsForProvider, 
  executeTool,
  getAvailableToolNames 
} from '@shared/services/toolService';
import { ApiProvider } from '@shared/types';

// Get available tool names
const toolNames = getAvailableToolNames();
console.log('Available tools:', toolNames);
// Output: ['createNote', 'getNote', 'listNotes', 'updateNote', 'searchNotes', 'deleteNote']

// Get tools in provider-specific format
const geminiTools = getToolsForProvider(ApiProvider.GEMINI);
// Returns array of GeminiFunctionDeclaration

const openaiTools = getToolsForProvider(ApiProvider.OPENAI);
// Returns array of OpenAIFunctionDefinition

// Execute a tool manually
const result = await executeTool({
  name: 'createNote',
  parameters: {
    title: 'Meeting Notes',
    content: 'Discussed Q4 roadmap...'
  }
});

if (result.success) {
  console.log('Note created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Integration with AI Chat

When integrating with AI providers (Gemini or OpenAI), you can pass the tools to the API:

#### Gemini Example

```typescript
import { GoogleGenAI } from '@google/genai';
import { getToolsForProvider, executeTool } from '@shared/services/toolService';
import { ApiProvider } from '@shared/types';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Get tools in Gemini format
const tools = getToolsForProvider(ApiProvider.GEMINI);

const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: 'Create a note about today\'s meeting',
  config: {
    tools: [{
      functionDeclarations: tools
    }]
  }
});

// If the model calls a function
if (response.functionCalls) {
  for (const functionCall of response.functionCalls) {
    const result = await executeTool({
      name: functionCall.name,
      parameters: functionCall.args || {}
    });
    
    console.log(`Tool ${functionCall.name} result:`, result);
  }
}
```

#### OpenAI Example

```typescript
import { getToolsForProvider, executeTool } from '@shared/services/toolService';
import { ApiProvider } from '@shared/types';

// Get tools in OpenAI format
const tools = getToolsForProvider(ApiProvider.OPENAI);

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Create a note about today\'s meeting' }
    ],
    tools: tools  // OpenAI tools format
  })
});

const data = await response.json();

// If the model calls a function
if (data.choices[0].message.tool_calls) {
  for (const toolCall of data.choices[0].message.tool_calls) {
    const result = await executeTool({
      name: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments)
    });
    
    console.log(`Tool ${toolCall.function.name} result:`, result);
  }
}
```

### For Future Agent Workflows

The same tools can be used in future agent implementations:

```typescript
import { toolRegistry } from '@ai/tools/registry';

// Get all tool definitions for agent planning
const allTools = toolRegistry.getAllDefinitions();

// Let agent decide which tools to use
for (const tool of allTools) {
  console.log(`${tool.name}: ${tool.description}`);
}

// Execute tools as part of agent workflow
const executor = toolRegistry.getExecutor('createNote');
if (executor) {
  const result = await executor({
    title: 'Agent Task',
    content: 'Automatically generated content'
  });
}
```

## Available Note Tools

### createNote
Create a new note with title and content.

**Parameters:**
- `title` (string, required): The title of the note
- `content` (string, required): The content of the note

**Returns:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "My Note",
    "content": "Note content",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### getNote
Get a specific note by ID.

**Parameters:**
- `id` (number, required): The ID of the note to retrieve

### listNotes
List all notes or get notes with pagination.

**Parameters:**
- `limit` (number, optional): Maximum number of notes to return
- `offset` (number, optional): Number of notes to skip for pagination

**Returns:**
```json
{
  "success": true,
  "data": {
    "notes": [...],
    "total": 10,
    "returned": 5
  }
}
```

### updateNote
Update an existing note by ID.

**Parameters:**
- `id` (number, required): The ID of the note to update
- `title` (string, optional): The new title for the note
- `content` (string, optional): The new content for the note

### searchNotes
Search notes by matching query against title and content.

**Parameters:**
- `query` (string, required): The search query

**Returns:**
```json
{
  "success": true,
  "data": {
    "notes": [...],
    "query": "meeting",
    "found": 3
  }
}
```

### deleteNote
Delete a note by its ID.

**Parameters:**
- `id` (number, required): The ID of the note to delete

## Architecture Benefits

### 1. **Reusability**
The tool system is designed to work with:
- Current chat features
- Future agent workflows
- Any custom integrations

### 2. **Provider Agnostic**
Automatic conversion to provider-specific formats:
- Gemini → `FunctionDeclaration` format
- OpenAI → `FunctionDefinition` format

### 3. **Type Safety**
Full TypeScript support with proper type definitions.

### 4. **Extensibility**
Easy to add new tools by following the pattern:
1. Define schema in `ai/tools/schemas/`
2. Implement executor in `ai/tools/executors/`
3. Register in `ai/tools/registry.ts`

### 5. **Centralized Management**
Single registry manages all tools, making it easy to:
- List available tools
- Enable/disable tools
- Track tool usage

## Testing Tools

You can test tools directly without AI integration:

```typescript
import { executeTool } from '@shared/services/toolService';

// Test createNote
const createResult = await executeTool({
  name: 'createNote',
  parameters: {
    title: 'Test Note',
    content: 'This is a test'
  }
});

console.log('Created note:', createResult);

// Test listNotes
const listResult = await executeTool({
  name: 'listNotes',
  parameters: {}
});

console.log('All notes:', listResult);

// Test searchNotes
const searchResult = await executeTool({
  name: 'searchNotes',
  parameters: {
    query: 'test'
  }
});

console.log('Search results:', searchResult);
```

## Error Handling

All tools return a consistent result format:

```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;    // Present when success is true
  error?: string;    // Present when success is false
}
```

Always check the `success` field before using `data`:

```typescript
const result = await executeTool({ name: 'getNote', parameters: { id: 999 } });

if (result.success) {
  console.log('Note:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Future Enhancements

Potential future additions to the tool system:

1. **Tool Permissions**: Control which tools are available in different contexts
2. **Tool Middleware**: Add logging, rate limiting, validation
3. **Tool Composition**: Combine multiple tools into workflows
4. **Tool Metadata**: Track usage statistics, performance metrics
5. **More Tool Categories**: File tools, calendar tools, web search tools, etc.

For implementation details, see the [tools README](./tools/README.md).
