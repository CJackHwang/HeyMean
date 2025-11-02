# HeyMean Architecture Documentation

## Overview

HeyMean is a modern AI learning assistant built with React 19, TypeScript, and Vite. The application features a clean, modular architecture with clear separation of concerns.

## Technology Stack

### Core
- **React 19.2** - Latest React with concurrent features
- **TypeScript 5.9** - Type-safe development
- **Vite 7.1** - Lightning-fast build tool
- **React Router 7.9** - Client-side routing with HashRouter

### UI & Rendering
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown support
- **remark-math & rehype-katex** - Mathematical expressions
- **react-syntax-highlighter** - Code syntax highlighting
- **@tanstack/react-virtual** - Virtualized list rendering

### Storage & APIs
- **IndexedDB** - Local persistent storage
- **@google/genai** - Google Gemini SDK
- **Native fetch API** - OpenAI-compatible endpoints

## Project Structure

```
heymean/
├── components/       # Reusable UI components
├── pages/           # Route-level page components
├── services/        # Business logic and external services
├── hooks/           # Custom React hooks
├── utils/           # Utility functions and helpers
├── locales/         # Internationalization files
├── types.ts         # TypeScript type definitions
└── App.tsx          # Application root
```

## Architecture Patterns

### 1. Provider Pattern

The app uses React Context providers for global state management:

```
ToastProvider
  └── SettingsProvider
      └── TranslationProvider
          └── HashRouter
              └── Routes
```

**Key Providers:**
- `ToastProvider` - Global toast notification system
- `SettingsProvider` - User settings and API configuration
- `TranslationProvider` - Internationalization (i18n)

### 2. Strategy Pattern

The API service layer uses the strategy pattern to support multiple AI providers:

```typescript
interface IChatService<T> {
  stream(chatHistory, newMessage, systemInstruction, config, onChunk, signal): Promise<void>;
}

class GeminiChatService implements IChatService<GeminiServiceConfig> { ... }
class OpenAIChatService implements IChatService<OpenAIServiceConfig> { ... }
```

This design allows seamless switching between Gemini and OpenAI-compatible APIs.

### 3. Custom Hooks Architecture

Custom hooks encapsulate complex business logic:

- **useConversation** - Manages conversation state and CRUD operations
- **useChatStream** - Handles AI streaming responses
- **useSettings** - Provides settings context and persistence
- **useTranslation** - Internationalization hook with caching
- **useAttachments** - File attachment handling
- **useMessageActions** - Message action handlers (resend, regenerate, delete)
- **useLongPress** - Cross-platform long-press detection
- **useToast** - Toast notification management

### 4. Service Layer

Services handle external interactions and business logic:

#### Database Service (`services/db.ts`)
- IndexedDB wrapper with schema migrations
- Type-safe CRUD operations for:
  - Conversations
  - Messages
  - Notes
  - Settings
- Automatic data hydration and validation

#### API Service (`services/apiService.ts`)
- Unified interface for multiple AI providers
- Streaming response handling
- Automatic retry logic for recoverable errors
- Error normalization

#### Error Handler (`services/errorHandler.ts`)
- Centralized error handling
- User-friendly error messages
- Error code classification

#### Stream Controller (`services/streamController.ts`)
- AbortController wrapper for cancellable requests
- Prevents re-entrancy issues

## Data Flow

### 1. User Message Flow

```
User Input (ChatInput)
  → useAttachments (file processing)
  → useConversation.startNewConversation() or addMessageToConversation()
  → IndexedDB (addMessage, addConversation)
  → useChatStream.streamResponse()
  → StreamController
  → apiService (Gemini/OpenAI)
  → onChunk callback
  → UI update (MessageBubble)
  → IndexedDB (saveUpdatedMessage)
```

### 2. Route Navigation Flow

```
User clicks navigation
  → preloadConversation() (if chat route)
  → Animation overlay system
  → Wait for preload + anchor
  → Smooth transition
  → loadConversation()
  → Render
```

## Key Features

### 1. Preloading System

The application implements a sophisticated preloading mechanism to ensure smooth transitions:

```typescript
// utils/preload.ts
class PreloadCache<K, V> {
  preload(key, loader): Promise<V>  // Start loading, don't await
  load(key, loader): Promise<V>     // Load or return cached
}
```

**Benefits:**
- Reduces perceived loading time
- Prevents redundant database queries
- Improves navigation smoothness

### 2. Virtual Scrolling

Large conversation lists use `@tanstack/react-virtual` for performance:

```typescript
const rowVirtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => chatContainerRef.current,
  estimateSize: (index) => estimateMessageHeight(messages[index]),
  overscan: 10,
});
```

**Benefits:**
- Handles thousands of messages efficiently
- Smooth scrolling experience
- Reduced memory footprint

### 3. Smooth Page Transitions

Custom animation system with:
- Preload-then-animate strategy
- Anchor point detection for chat page
- Overlay-based forward/back animations
- No content flash during transitions

### 4. Thinking Process Display

Real-time AI reasoning visualization:
- Parses XML-like thinking tags (`<thinking>`, `<thought>`, etc.)
- Collapsible UI for thinking content
- Duration tracking
- Smooth reveal animation

### 5. Message Actions

Context menu system with:
- Long-press detection (mobile)
- Right-click support (desktop)
- Copy, resend, regenerate, delete actions
- Optimistic UI updates

## Storage Schema

### IndexedDB Structure

**Database:** `HeyMeanDB` (version 5)

#### Object Stores:

1. **conversations**
   - Key: `id` (string)
   - Indexes: `updatedAt`
   - Fields: `id, title, createdAt, updatedAt, isPinned`

2. **messages**
   - Key: `id` (string)
   - Indexes: `conversationId`
   - Fields: `id, conversationId, sender, text, timestamp, attachments`

3. **notes**
   - Key: `id` (auto-increment)
   - Indexes: `updatedAt`, `isPinned`
   - Fields: `id, title, content, createdAt, updatedAt, isPinned`

4. **settings**
   - Key: `key` (string)
   - Fields: `key, value`

### Data Hydration

All data retrieved from IndexedDB is hydrated through validation helpers:

```typescript
const ensureDate = (value: unknown, fallback: Date = new Date()): Date
const hydrateConversation = (record: Record<string, unknown>): Conversation
const hydrateNote = (record: Record<string, unknown>): Note
```

This ensures type safety and handles legacy data gracefully.

## Type System

### Core Types

```typescript
enum MessageSender { USER, AI }
enum ApiProvider { GEMINI, OPENAI }
enum Theme { LIGHT, DARK }
enum Language { EN, ZH_CN, JA }

interface Message {
  id: string;
  conversationId: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  attachments?: Attachment[];
  isLoading?: boolean;
  thinkingText?: string;
  isThinkingComplete?: boolean;
  thinkingStartTime?: number;
  thinkingDuration?: number;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
}

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
}
```

### Utility Types

```typescript
type AttachmentStored = Omit<Attachment, 'preview'>;
type MessageStored = Omit<Message, 'timestamp' | 'attachments' | 'isLoading' | ...> & {
  timestamp: string;
  attachments?: AttachmentStored[];
};
type ConversationUpdate = Partial<Omit<Conversation, 'id' | 'createdAt'>>;
type NoteUpdate = Partial<Omit<Note, 'id' | 'createdAt'>>;
```

## Error Handling

### Centralized Error Handler

```typescript
class AppError extends Error {
  code: string;
  userMessage: string;
}

function handleError(error: unknown, context: string, meta?: object): AppError
```

**Error Categories:**
- `API_ERROR` - API-related failures
- `DB_ERROR` - Database operation failures
- `CONFIG_ERROR` - Configuration issues
- `UNSUPPORTED_ATTACHMENT` - Invalid file types
- `CANCELLED` - User-cancelled operations

### Error Flow

```
Error occurs
  → handleError() normalizes error
  → AppError with user-friendly message
  → Toast notification
  → Logged to console (dev mode)
```

## Internationalization (i18n)

### Translation System

```
locales/
  ├── en.json
  ├── zh-CN.json
  └── ja.json
```

**Usage:**
```typescript
const { t } = useTranslation();
const message = t('home.greeting');
```

**Features:**
- Lazy loading
- Caching
- Fallback to English
- Type-safe keys (via constants)

## Performance Optimizations

### 1. Component-Level
- Memoization with `React.memo()`
- `useCallback` for stable function references
- `useMemo` for expensive computations
- Virtualized lists for large datasets

### 2. Data-Level
- Preloading cache to avoid redundant queries
- Batch operations for multiple DB writes
- Debounced auto-save for notes

### 3. UI-Level
- Smooth CSS animations with GPU acceleration
- Lazy component initialization
- Optimistic UI updates
- Efficient scroll handling

## Security & Privacy

### Data Storage
- All data stored locally in IndexedDB
- No server-side transmission
- API keys encrypted by browser

### File Handling
- Client-side file validation
- Size limits enforced (5MB per file, max 4 files)
- Automatic image compression
- Type restrictions per provider

## Build & Deployment

### Development
```bash
npm run dev    # Start dev server (localhost:3000)
```

### Production
```bash
npm run build  # Build optimized bundle
npm run preview # Preview production build
```

### Deployment Targets
- Static hosting (Vercel, Netlify, GitHub Pages)
- No server-side configuration required (HashRouter)
- Environment variables optional (can configure in-app)

## Testing Strategy

### Manual Testing Focus Areas
1. Multi-provider compatibility (Gemini, OpenAI)
2. File attachment handling (images, text, PDFs)
3. Conversation management (pin, rename, delete)
4. Notes workspace (CRUD, auto-save, pin)
5. Cross-browser compatibility
6. Mobile responsiveness
7. Long conversation performance
8. Error recovery scenarios

## Future Enhancements

### Potential Improvements
1. **Testing** - Add unit and integration tests
2. **Offline Mode** - Full PWA support with service workers
3. **Export/Import** - Backup and restore conversations
4. **Search** - Full-text search across conversations
5. **Themes** - More customization options
6. **Voice Input** - Speech-to-text support
7. **Collaboration** - Share conversations (with backend)

## Contributing

See the main README.md for contribution guidelines. Key principles:
- Follow existing code patterns
- Add TypeScript types for all new code
- Test with both Gemini and OpenAI providers
- Update translations for all supported languages
- Ensure mobile responsiveness

## License

MIT License - See LICENSE file for details.
