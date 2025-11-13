# AI Module

This directory contains AI capabilities including function calling tools and reserved space for future agent features.

## Current Implementation

### ✅ Tools System (`tools/`)

Complete function calling system for AI chat and future agent workflows.

**Structure:**
- `types.ts` - Core type definitions for tools
- `registry.ts` - Tool registry and management
- `adapters.ts` - Provider format converters (Gemini/OpenAI)
- `notes/` - Note management tools (create, read, list, update)

**Documentation:**
- [README_TOOLS.md](./README_TOOLS.md) - Complete API documentation
- [USAGE_EXAMPLE.md](./tools/USAGE_EXAMPLE.md) - Usage examples and patterns
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation details

**Quick Start:**
```typescript
import { defaultToolRegistry } from '@ai/tools';

// Tools are automatically enabled in chat
// AI can now create, read, list, and update notes

// Or use tools directly
const context = createToolContext();
const result = await defaultToolRegistry.execute(
  'createNote',
  { title: 'My Note', content: 'Content' },
  context
);
```

### Features

- ✅ **4 Note Tools**: createNote, readNote, listNotes, updateNote
- ✅ **Provider Support**: Gemini and OpenAI compatible
- ✅ **Auto-enabled**: Works in chat with zero configuration
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Reusable**: Same API for chat and future agents
- ✅ **Extensible**: Easy to add new tools
- ✅ **Error Handling**: Graceful error handling and reporting

## Future Development

### Planned Structure

- **clients/**: Unified LLM client interfaces for multiple providers
- **mcp/**: MCP (Model Context Protocol) connectors and capability management
- **agents/**: Agent runtime, including planners, memory, and execution
- **adapters/**: Environment adapters (browser, worker, service worker)
- **prompts/**: Prompt templates and fragment management

## Integration Guidelines

When adding new features to this module:
- Be isolated from the core chat features (`features/chat`)
- Use dynamic imports to avoid impacting base bundle size
- Expose interfaces through `shared/services` for controlled access
- Support lazy loading and code splitting
- Follow the established tool architecture for consistency

## Usage in Chat

Tools are automatically available when using the chat API:

```typescript
// In useChatStream.tsx - no changes needed!
const result = await streamChatResponse(
  chatHistory,
  userMessage,
  config, // Tools are auto-included
  onChunk,
  signal
);
```

The AI will automatically use tools when appropriate based on:
- User intent ("create a note", "list my notes")
- System prompt instructions
- Tool descriptions

## Adding New Tools

1. Create tool definition in `tools/[category]/definitions.ts`
2. Create executor in `tools/[category]/executors.ts`
3. Register in `tools/registry.ts`
4. Update documentation

See [README_TOOLS.md](./README_TOOLS.md) for detailed instructions.

## Testing

Manual testing:
```typescript
// In browser console
import('./ai/tools/__tests__/notes.test.example')
  .then(m => m.runExamples());
```

Integration testing:
- Ask AI to create/read/list/update notes
- Verify database operations
- Check error handling

For more details, see the main ARCHITECTURE.md in the project root.
