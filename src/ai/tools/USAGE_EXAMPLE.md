# AI Tools Usage Examples

## Quick Start: Enable Tools in Chat

Tools are automatically enabled by default when using the chat API. All registered tools in the `defaultToolRegistry` will be available to the AI.

### Example Chat Interaction

**User:** "Create a note titled 'Meeting Notes' with content 'Discussed project timeline'"

**AI Response:**
```
[Executing tool: createNote]
[Tool result: {"id":123,"title":"Meeting Notes","content":"Discussed project timeline","createdAt":"2024-01-01T00:00:00.000Z","message":"Note \"Meeting Notes\" created successfully with ID 123"}]

I've created a note titled "Meeting Notes" with your content. The note has been saved with ID 123.
```

**User:** "Show me all my notes"

**AI Response:**
```
[Executing tool: listNotes]
[Tool result: {"notes":[...],"total":5,"returned":5}]

You have 5 notes:
1. Meeting Notes (ID: 123) - Created: 2024-01-01
2. Project Ideas (ID: 124) - Created: 2024-01-02
...
```

## Disable Tools for Specific Conversations

If you want to disable tools for a specific use case, pass an empty tools array:

```typescript
import { streamChatResponse } from '@shared/services/apiService';

const result = await streamChatResponse(
  chatHistory,
  userMessage,
  {
    ...config,
    tools: [], // Disable all tools
  },
  onChunk,
  signal
);
```

## Enable Only Specific Tools

```typescript
import { streamChatResponse } from '@shared/services/apiService';
import { createNoteToolDefinition, readNoteToolDefinition } from '@ai/tools/notes';

// Only allow creating and reading notes, not listing or updating
const result = await streamChatResponse(
  chatHistory,
  userMessage,
  {
    ...config,
    tools: [createNoteToolDefinition, readNoteToolDefinition],
  },
  onChunk,
  signal
);
```

## Testing Tool Execution

You can test tool execution independently:

```typescript
import { defaultToolRegistry, createToolContext } from '@ai/tools';

// Test createNote
const context = createToolContext();
const result = await defaultToolRegistry.execute(
  'createNote',
  { 
    title: 'Test Note',
    content: 'This is a test'
  },
  context
);

console.log(result);
// Output: { success: true, data: { id: 123, title: 'Test Note', ... } }
```

## Common Use Cases

### Use Case 1: Note-Taking Assistant

**Prompt:** "I want you to help me take notes during our conversation. Whenever I mention something important, automatically save it as a note."

The AI will use the `createNote` tool automatically when it detects important information.

### Use Case 2: Information Retrieval

**Prompt:** "What did I note down about the project timeline?"

The AI will:
1. Use `listNotes` to find relevant notes
2. Use `readNote` to get the full content
3. Summarize the information for you

### Use Case 3: Note Management

**Prompt:** "Update my meeting notes to include action items: 1. Follow up with team, 2. Prepare presentation"

The AI will use `updateNote` to append this information to the existing note.

## Advanced: Custom System Prompt for Tool Usage

You can customize the system prompt to guide how AI uses tools:

```typescript
const systemInstruction = `You are a helpful assistant with access to note management tools.

Guidelines for tool usage:
1. Always ask for confirmation before creating or updating notes
2. When listing notes, provide a brief summary for each
3. Use tools proactively when users express intent to save information
4. Keep note titles concise and descriptive

Available tools:
- createNote: Create new notes
- readNote: Read existing notes
- listNotes: List all notes
- updateNote: Update existing notes`;

const result = await streamChatResponse(
  chatHistory,
  userMessage,
  {
    ...config,
    systemInstruction,
  },
  onChunk,
  signal
);
```

## Integration with Chat UI

The tools work seamlessly with the existing chat interface. Tool execution results are streamed as part of the AI response, so users see the tools being executed in real-time.

Example in `useChatStream.tsx`:

```typescript
const { streamResponse } = useChatStream();

// Tools are automatically enabled - no changes needed!
await streamResponse(chatHistory, userMessage, aiMessageId);

// The AI will automatically call tools when appropriate
// Tool execution messages will appear in the chat stream
```

## Monitoring Tool Usage

You can add logging to track tool usage:

```typescript
import { ToolRegistry, createToolContext } from '@ai/tools';

class LoggingToolRegistry extends ToolRegistry {
  async execute(name: string, args: Record<string, any>, context: ToolExecutionContext) {
    console.log(`[Tool Called] ${name}`, args);
    const result = await super.execute(name, args, context);
    console.log(`[Tool Result] ${name}`, result);
    return result;
  }
}

const loggingRegistry = new LoggingToolRegistry();
// Register tools...

// Use in API calls
const result = await streamChatResponse(
  chatHistory,
  userMessage,
  {
    ...config,
    toolRegistry: loggingRegistry,
  },
  onChunk,
  signal
);
```

## Error Handling

Tools handle errors gracefully and return error information to the AI:

```typescript
// If a tool fails, the AI receives the error and can respond appropriately
{
  success: false,
  error: "Note with ID 999 not found"
}
```

The AI will then inform the user about the error in a friendly way:

```
I tried to read note 999, but it doesn't exist. Would you like me to list your available notes instead?
```

## Performance Considerations

- Tools are executed sequentially within each AI turn
- Maximum 5-6 tool call iterations per chat turn (configurable)
- Large note content is automatically previewed in list operations
- Tool execution is non-blocking for the UI

## Future Enhancements

The tool system is designed to support:
- **Parallel tool execution**: Execute multiple tools simultaneously
- **Tool chains**: Automatic chaining of related tools
- **Tool permissions**: User-level permissions for tool access
- **Tool analytics**: Track tool usage patterns
- **Agent workflows**: Use tools in autonomous agents
