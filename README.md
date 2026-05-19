<div align="center">

# 何意味 (HeyMean) 

**AI Learning Assistant - Making Learning an Addiction, Not a Chore**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-1.28-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-AGPL%203.0-green.svg)](LICENSE)

[View in AI Studio](https://ai.studio/apps/drive/1FrpJ1oHeY4gveHbT1iJn3y7TvmEbmecR) | [English](#english) | [中文](#中文)

</div>

---

<a id="english"></a>

## ✨ Features

### 🤖 Multi-AI Provider Support
- **Google Gemini** - Full feature support including PDF analysis (Gemini 2.5 Flash/Pro)
- **OpenAI Compatible APIs** - Support for OpenAI and compatible endpoints (e.g., Azure OpenAI, local models)
- Automatic model fetching from OpenAI-compatible endpoints
- Custom base URL configuration
- Flexible model selection

### 💬 Intelligent Chat Interface
- **Rich Message Display** - Markdown rendering with syntax highlighting (powered by react-syntax-highlighter)
- **Responsive Markdown** - Tables with horizontal scrolling, copy table data, optimized image rendering, and mobile-friendly code blocks
- **Mathematical Expressions** - LaTeX/KaTeX via remark-math; rehype-katex loads on demand while KaTeX CSS is bundled globally
- **File Attachments** - Attach up to 4 files (≤5 MB each), covering images (PNG/JPG/GIF/WebP), plain-text/Markdown, and PDFs (Gemini only) with intelligent compression
- **Thinking Process Display** - Visualize AI reasoning steps in real-time with collapsible sections
- **Streaming Responses** - See AI responses as they're generated with real-time typing effect
- **Message Edit & Resend** - Edit and re-submit user messages with full attachment support, auto-scroll to edited position
- **Message Actions** - Copy, edit, resend, regenerate, and delete messages with context menu
- **Mobile-Optimized Composer** - Responsive input with flexible textarea, attachment chips, and clear edit mode indicators
- **Long-Press Support** - Quick access to message actions on mobile devices with 500ms touch detection
- **Smooth Animations** - Page transitions with easing and route-aware preloading
- **PWA Mobile Optimizations** - Pull-to-refresh disabled, optimized viewport settings, iOS safe area support

### 📝 Integrated Notes Workspace
- Create and manage notes alongside your conversations
- Pin important notes for quick access
- Full Markdown support with live preview
- Auto-save functionality with unsaved changes detection
- Rename and organize notes with context menu
- Split view on desktop, drawer on mobile

### 🗂️ Conversation Management
- **History Tracking** - All conversations automatically saved to IndexedDB
- **Pin Conversations** - Keep important chats at the top
- **Rename & Delete** - Organize your learning journey from the history page
- **Long-Press Actions** - Access copy/edit/resend/regenerate/delete from chat history
- **Continue Where You Left Off** - Resume your last conversation instantly from the home screen
- **Preloaded Navigation** - Instant page transitions with data preloading

### 🎨 Personalization
- **Theme Switching** - Light and dark modes with system preference support
- **Multi-language Support** - English (en), 简体中文 (zh-CN), 日本語 (ja)
- **Custom System Prompts** - Define AI personality and behavior
- **Local Storage** - All data stored locally in your browser (IndexedDB)
- **Toast Notifications** - Non-intrusive feedback for actions
- **AI Tools Integration** - Built-in note management tools accessible via AI providers
- **AI Tools Integration** - Built-in note management tools accessible via AI providers with extensible tool framework

### 🔒 Privacy & Security
- API keys stored locally in browser (IndexedDB)
- No server-side data transmission
- Complete data control with clear all data option
- Works offline after initial load
- No tracking or analytics

---

## 🧱 Architecture Highlights

### Provider Composition
- **ToastProvider** - Centralized notification system
- **SettingsProvider** - Global settings management with persistence
- **TranslationProvider** - i18n support with locale caching
- **AppReadyProvider** - Compatibility wrapper; no startup gate (renders immediately)
- All providers wrap the router for optimal state access and initialization order

### Strategy Pattern
- **apiService.ts** - Unified API interface that dispatches between Gemini and OpenAI implementations
- **streamController.ts** - Cross-provider streaming control with cancel/retry support
- **errorHandler.ts** - Centralized error handling with user-friendly messages
- **toolService.ts** - Unified tool calling interface for AI function execution

### IndexedDB Persistence
- Conversations, messages, notes, and settings stored locally
- Schema migrations for version updates
- Transaction-based operations for data integrity
- Optimistic updates for better UX

### Feature-Based Architecture
- **Chat Feature** (`features/chat/`) - Complete chat functionality with UI, business logic, and state management
  - UI components: ChatHeader, ChatMessagesArea, ChatFooter, NotesPanel
  - Model hooks: useConversation, useChatStream, useAttachments, useMessageActions
  - Scroll management and notes panel state
- **Shared UI Components** (`shared/ui/`) - Reusable components across features
  - ChatInput, MessageBubble, MarkdownRenderer, Modal, ListItemMenu, etc.
- **Global Providers** (`app/providers/`) - Application-wide state management
  - useSettings, useTranslation, useToast, AppReadyProvider
- **AI Tools** (`ai/tools/`) - Extensible tool system for AI function calling
  - Tool registry, executors, and schemas
  - Built-in note management tools
  - Provider-agnostic tool definitions

### Hooks Architecture
- **Business Logic Hooks** (in `features/chat/model/`)
  - **useConversation** - Conversation state management, editing/resend orchestration, and DB operations
  - **useChatStream** - AI streaming response handler with cancel support
  - **useAttachments** - File attachment handling with compression and validation
  - **useMessageActions** - Context menu actions for copy, edit, resend, regenerate, delete
  - **useChatActions** - Chat-level actions and state management
  - **useScrollManagement** - Automatic scrolling behavior
  - **useNotesPanel** - Notes panel state management
- **Shared Hooks** (in `shared/hooks/`)
  - **useLongPress** - Touch-friendly long-press detection for mobile
- **Provider Hooks** (in `app/providers/`)
  - **useToast** - Toast notification management
  - **useSettings** - Settings context and persistence
  - **useTranslation** - i18n hooks with caching

### UI Components
- **ChatInput** - Unified composer with edit mode, attachment chips, and mobile-friendly layout
- **MessageBubble** - Collapsible thinking view, responsive Markdown rendering, attachment gallery
- **ListItemMenu + Modal** - Contextual action menu with confirmation flows and keyboard focus management
- **MarkdownRenderer** - Rich markdown rendering with syntax highlighting and math support

### Responsive Layout
- **Desktop**: Chat + Notes split view with flexible panels
- **Mobile**: Optimized mobile experience with bottom composer and safe-area padding
- **Virtualized Rendering**: Efficient message list with @tanstack/react-virtual
- **Custom Scrollbar**: Styled scrollbars that match the theme

### Performance Optimizations
- **Route-based code splitting** - Fine-grained vendor chunking to avoid large bundles
- **Data preloading during navigation** - Smart caching with router layer (AnimatedRoutes + routePreloader)
- **Virtual scrolling** - Efficient message list rendering with @tanstack/react-virtual
- **Image compression** - Automatic compression for attachments exceeding size limits
- **Debounced auto-save** - Notes saved automatically without performance impact
- **On-demand math rendering** - rehype-katex loads only when math is detected; KaTeX CSS is bundled globally for consistent rendering
- **Smooth page transitions** - 580ms eased animations with wait-for-anchor logic to prevent layout shifts
- **Blob URL management** - Automatic cleanup of object URLs to prevent memory leaks
- **Self-hosted assets** - Fonts and icons are self-hosted (no external CDNs)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher (tested with Node.js 18+)
- **npm** or **yarn** package manager
- **API Key** from one of:
  - [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini)
  - [OpenAI Platform](https://platform.openai.com/api-keys) (OpenAI)
  - Or any OpenAI-compatible endpoint

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd heymean-ai-learning-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API keys**

   Set your keys in the in-app Settings page (no .env needed). Keys are stored locally in your browser (IndexedDB).

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

5. **Build for production**
   ```bash
   npm run build
   ```
   
   Preview the production build:
   ```bash
   npm run preview
   ```

---

## 📖 Usage Guide

### First Time Setup

1. **Launch the app** and navigate to **Settings** (⚙️ icon)
2. **Choose your AI provider**:
   - Select "Google Gemini" or "OpenAI Compatible"
3. **Enter your API key**:
   - For Gemini: Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - For OpenAI: Get your key from [OpenAI Platform](https://platform.openai.com/api-keys)
4. **Configure additional settings** (optional):
   - Custom system prompt
   - Model selection (Gemini 2.5 Flash/Pro for Gemini, auto-fetch for OpenAI)
   - Base URL (for custom OpenAI-compatible endpoints)
   - Request mode: `proxy` (recommended) / `direct`
   - Language and theme preferences

### Request Mode & Same-Origin Proxy

- The app now supports two OpenAI request modes:
  - `proxy` (default): requests go through same-origin `/api/llm/*` routes.
  - `direct`: browser requests upstream API directly.
- If your upstream endpoint does **not** provide proper CORS headers, use **`proxy`** mode.
- Development proxy is preconfigured in Vite for `/api/llm/openai/v1 -> https://api.openai.com/v1`.
- For production, deploy a gateway/edge proxy and forward `/api/llm/openai/v1/*` to your upstream OpenAI-compatible endpoint.
- A standalone proxy example is provided at `scripts/llm-proxy.mjs`:
  - Authorization forwarding/injection
  - CORS header unification
  - Error format normalization
  - Optional timeout/retry and audit log

### Starting a Conversation

1. **Home page**: Enter your question in the input field
2. **Attach files** (optional): Click the 📎 icon to upload images, PDFs, or text files
3. **Send**: Press Enter or click Send
4. **View AI thinking**: Watch the AI's reasoning process in real-time (collapsible section)
5. **Continue learning**: Ask follow-up questions to dive deeper
6. **Edit messages**: Right-click or long-press any user message to edit and re-submit

### Managing Conversations

- **View History**: Click the 📚 icon to see all past conversations
- **Pin Important Chats**: Right-click or long-press → "Pin to top"
- **Rename**: Right-click or long-press → "Rename"
- **Delete**: Right-click or long-press → "Delete"
- **Resume**: Click any conversation to continue where you left off

### Using Notes

1. **Switch to Notes tab** in the chat interface
2. **Create notes** while learning
3. **Pin important notes** for quick reference
4. **Auto-save**: Notes save automatically as you type
5. **Markdown preview**: View formatted notes in real-time

### Message Actions

- **Copy**: Copy message content to clipboard
- **Edit** (User messages): Modify your message text and attachments, then re-submit (subsequent messages are deleted)
- **Resend** (User messages): Resend a message without editing and delete subsequent messages
- **Regenerate** (AI messages): Generate a new response for the same prompt
- **Delete**: Remove a message from the conversation
- Access via context menu (right-click or long-press on desktop/mobile)

---

## 🏗️ Tech Stack

### Frontend Framework
- **React 19.2** - Latest React with concurrent features
- **TypeScript 5.9** - Type-safe development
- **Vite 7.1** - Lightning-fast build tool
- **React Router 7.9** - Client-side routing with HashRouter

### UI & Styling
- **TailwindCSS 4.0** - Utility-first CSS framework
- **@tailwindcss/vite 4.0** - Vite plugin for Tailwind
- **@tailwindcss/postcss 4.0** - PostCSS plugin
- **Material Symbols** - Self-hosted via npm (`material-symbols`)
- **Inter font** - Self-hosted via `@fontsource/inter`

### Markdown & Code Rendering
- **react-markdown 10.1** - Markdown rendering
- **remark-gfm 4.0** - GitHub Flavored Markdown support
- **remark-math 6.0** - Mathematical notation parsing
- **rehype-katex 7.0** - LaTeX/KaTeX rendering
- **react-syntax-highlighter 16.1** - Code syntax highlighting

### State Management
- **React Context** - Settings, Translation, and Toast providers
- **React Hooks** - Custom hooks for DB, streaming, and UI logic

### Storage & APIs
- **IndexedDB** - Local persistent storage for all app data
- **@google/genai 1.28** - Google Gemini SDK
- **fetch API** - OpenAI-compatible endpoints
- **AI Tools Framework** - Extensible tool calling system for AI function execution

### Performance
- **@tanstack/react-virtual 3.13** - Virtual scrolling for message lists

---

## 📁 Project Structure

The project follows **Feature-Sliced Design (FSD)** architecture for better modularity, scalability, and maintainability:

```
heymean-ai-learning-assistant/
├── src/
│   ├── app/                    # Application layer
│   │   ├── App.tsx                # Application root component
│   │   ├── providers/             # Global providers (Toast, Settings, Translation, AppReady)
│   │   │   ├── AppProviders.tsx      # Provider composition
│   │   │   ├── useSettings.tsx       # Settings context & hooks
│   │   │   ├── useTranslation.tsx    # i18n context & hooks
│   │   │   ├── useToast.tsx          # Toast notification provider
│   │   │   └── AppReadyProvider.tsx  # App initialization wrapper
│   │   ├── router/                # Routing configuration
│   │   │   └── AppRouter.tsx         # Router setup with lazy loading
│   │   ├── layout/                # Application layout components
│   │   └── assets/                # Global assets and CSS
│   │       ├── index.css             # Tailwind directives and custom styles
│   │       └── fonts-preload.ts      # Font preloading
│   ├── features/               # Feature modules (business logic)
│   │   └── chat/                  # Chat feature
│   │       ├── ui/                   # Feature-specific UI components
│   │       │   ├── ChatHeader.tsx       # Chat page header
│   │       │   ├── ChatMessagesArea.tsx # Message list with virtualization
│   │       │   ├── ChatFooter.tsx       # Chat input area
│   │       │   └── NotesPanel.tsx       # Notes side panel
│   │       ├── model/                # Business logic and hooks
│   │       │   ├── useConversation.tsx  # Conversation state management
│   │       │   ├── useChatStream.tsx    # AI streaming handler
│   │       │   ├── useAttachments.tsx   # File attachment handling
│   │       │   ├── useMessageActions.tsx # Message actions (edit/delete/regenerate)
│   │       │   ├── useChatActions.ts    # Chat-level actions
│   │       │   ├── useScrollManagement.ts # Auto-scroll behavior
│   │       │   └── useNotesPanel.ts     # Notes panel state
│   │       ├── api/                  # Feature-specific API calls
│   │       └── lib/                  # Feature-specific utilities
│   ├── ai/                     # AI tools and utilities
│   │   ├── tools/                # Tool system for AI function calling
│   │   │   ├── registry.ts         # Tool registration
│   │   │   ├── executors/          # Tool implementations
│   │   │   ├── schemas/            # Tool schemas
│   │   │   └── types.ts            # Tool types
│   │   └── README.md              # AI tools documentation
│   ├── shared/                 # Shared/reusable resources
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── ChatInput.tsx         # Message input with attachments
│   │   │   ├── MessageBubble.tsx     # Chat message display
│   │   │   ├── MarkdownRenderer.tsx  # Markdown rendering component
│   │   │   ├── MarkdownSurface.tsx   # Markdown wrapper with styling
│   │   │   ├── CodeBlock.tsx         # Code syntax highlighting
│   │   │   ├── NotesView.tsx         # Notes CRUD interface
│   │   │   ├── Modal.tsx             # Confirmation dialogs
│   │   │   ├── ListItemMenu.tsx      # Context menu component
│   │   │   └── Selector.tsx          # Dropdown selector
│   │   ├── hooks/                 # Reusable hooks
│   │   │   └── useLongPress.tsx      # Long-press detection for mobile
│   │   ├── services/              # Core services
│   │   │   ├── db.ts                 # IndexedDB operations
│   │   │   ├── apiService.ts         # Unified API service (Gemini/OpenAI)
│   │   │   ├── streamController.ts   # Streaming control (cancel/retry)
│   │   │   ├── toolService.ts        # Tool calling interface for AI functions
│   │   │   └── errorHandler.ts       # Error handling utilities
│   │   ├── lib/                   # Utility functions
│   │   │   ├── constants.ts          # Application constants
│   │   │   ├── dateHelpers.ts        # Date formatting
│   │   │   ├── fileHelpers.ts        # File compression and validation
│   │   │   ├── textHelpers.ts        # Text processing
│   │   │   ├── attachmentHelpers.ts  # Attachment preview utilities
│   │   │   ├── preload.ts            # Resource preloading
│   │   │   └── preloadPayload.ts     # Data preloading for navigation
│   │   └── types/                 # Shared TypeScript types
│   │       ├── index.ts              # Type definitions
│   │       └── global.d.ts           # Global type declarations
│   ├── pages/                  # Route-level page components
│   │   ├── HomePage.tsx           # Landing page
│   │   ├── ChatPage.tsx           # Main chat interface
│   │   ├── HistoryPage.tsx        # Conversation history
│   │   ├── SettingsPage.tsx       # Settings panel
│   │   └── AboutPage.tsx          # About page
│   ├── widgets/                # Complex composite components
│   ├── entities/               # Domain entities (future use)
│   ├── ai/                     # AI/Agent capabilities (reserved for future)
│   └── workers/                # Web Workers (future use)
├── public/                     # Static assets
│   ├── locales/                   # Internationalization files
│   │   ├── en.json                   # English translations
│   │   ├── zh-CN.json                # Simplified Chinese
│   │   └── ja.json                   # Japanese
│   └── prompt.txt                 # Default AI system prompt
├── index.tsx                   # Application entry point
├── index.html                  # HTML template
├── vite.config.ts              # Vite configuration with path aliases
├── tailwind.config.ts          # TailwindCSS configuration
├── tsconfig.json               # TypeScript configuration
├── postcss.config.cjs          # PostCSS configuration
├── package.json                # Dependencies and scripts
├── ARCHITECTURE.md             # Detailed architecture documentation
└── README.md                   # This file
```

### Path Aliases

The project uses path aliases for cleaner imports:

- `@app/*` → `src/app/*`
- `@shared/*` → `src/shared/*`
- `@features/*` → `src/features/*`
- `@pages/*` → `src/pages/*`
- `@widgets/*` → `src/widgets/*`
- `@entities/*` → `src/entities/*`
- `@ai/*` → `src/ai/*`
- `@workers/*` → `src/workers/*`

### Architecture Principles

- **Feature-First**: Business logic is organized by features, not by technical layers
- **Shared Resources**: Common UI components, hooks, and utilities are in `shared/`
- **Clear Dependencies**: Lower layers (`shared`) don't depend on upper layers (`features`, `pages`)
- **Lazy Loading**: Routes and features are loaded on demand for better performance
- **Separation of Concerns**: UI, business logic, and data access are clearly separated

For detailed architecture guidelines, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 🌐 Internationalization

Currently supported languages:

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Fully supported |
| 简体中文 | `zh-CN` | ✅ Fully supported |
| 日本語 | `ja` | ✅ Fully supported |

To add a new language:
1. Create a new JSON file in `public/locales/` (e.g., `public/locales/es.json`)
2. Add the language to `src/shared/types/index.ts` Language enum
3. Update the language selector in `src/pages/SettingsPage.tsx`
4. Translate all keys from `public/locales/en.json`

---

## 🔧 Configuration

### Environment Variables

No environment variables are required for normal usage. Configure your API keys in Settings. For advanced setups, you may still use Vite envs as needed.

### Customizing the System Prompt

1. **In-app**: Go to Settings → Model Settings → System Prompt
2. **File-based**: Edit `public/prompt.txt` (served at `/prompt.txt`)

### OpenAI-Compatible Endpoints

Configure custom endpoints in Settings:
- **Base URL**: e.g., `https://api.openai.com/v1` or your custom endpoint
- **API Key**: Your OpenAI or compatible API key
- **Fetch Models**: Automatically retrieve available models from endpoint
- **Model Selection**: Choose from fetched models or enter manually

---

## 🚢 Deployment

### Deploy to Static Hosting

The app can be deployed to any static hosting service:

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm run build
# Upload the dist/ folder to Netlify
```

#### GitHub Pages
```bash
npm run build
# Deploy the dist/ folder to GitHub Pages
```

> **Note**: When deploying, ensure the HashRouter is used (already configured) for proper routing without server-side configuration.

---

## 🛠️ Development

### Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Style

This project uses:
- **TypeScript** for type safety with strict mode enabled
- **React 19** features (hooks, context, concurrent features)
- **Functional components** with hooks (no class components)
- **ES6+ syntax** (async/await, arrow functions, destructuring)
- **TailwindCSS** for styling (utility-first approach)
- **Strict TypeScript configuration** - `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` enabled

### Key Development Guidelines

- Follow existing code patterns and component structure
- Add TypeScript types for all new code
- Test with both Gemini and OpenAI providers
- Update translations for all supported languages (en, zh-CN, ja)
- Ensure responsive design works on mobile and desktop
- Use custom hooks for reusable logic
- Leverage IndexedDB for all persistent data

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and patterns
- Add TypeScript types for all new code
- Test with both Gemini and OpenAI providers
- Update translations for all supported languages
- Ensure responsive design works on mobile
- Write meaningful commit messages
- Update documentation as needed

---

## 📝 License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** for powerful AI capabilities
- **OpenAI** for the GPT API standard
- **React Team** for the amazing framework
- **Vite Team** for the blazing-fast build tool
- **TailwindCSS** for the utility-first CSS framework
- All open-source contributors whose libraries made this possible

---

## 📧 Support

- **GitHub Repository**: [https://github.com/CJackHwang/HeyMean](https://github.com/CJackHwang/HeyMean)
- **Issues**: Report bugs or request features via GitHub Issues
- **AI Studio**: [View App](https://ai.studio/apps/drive/1FrpJ1oHeY4gveHbT1iJn3y7TvmEbmecR)

---

<div align="center">

**Made with ❤️ for learners everywhere**

⭐ **Star this repo if you find it helpful!**

</div>

---

# 中文

<div align="center">

## 何意味 (HeyMean) - AI 学习助手

**让学习成为神经层面的正向成瘾，而非意志力消耗战**

</div>

### 🎯 核心特性

#### 🤖 多 AI 提供商支持
- **Google Gemini** - 完整功能支持，包括 PDF 分析（Gemini 2.5 Flash/Pro）
- **OpenAI 兼容 API** - 支持 OpenAI 及兼容端点（如 Azure OpenAI、本地模型）
- 自动从端点获取可用模型
- 自定义基础 URL 配置
- 灵活的模型选择

#### 💬 智能对话界面
- **富文本消息** - Markdown 渲染，语法高亮（react-syntax-highlighter）
- **响应式 Markdown** - 表格横向滚动、复制表格数据、优化图片渲染和移动端友好的代码块
- **数学表达式** - LaTeX/KaTeX 支持（remark-math 和 rehype-katex），按需加载
- **文件附件** - 最多支持 4 个文件（≤5 MB），涵盖图片（PNG/JPG/GIF/WebP）、纯文本/Markdown，PDF 仅限 Gemini，并自动压缩图片
- **思考过程展示** - 可折叠的 AI 推理过程，实时查看
- **流式响应** - 实时查看 AI 生成的回复，具有动态输出效果
- **消息编辑与重发** - 编辑并重新提交用户消息，支持完整附件，自动滚动到编辑位置
- **消息操作** - 通过上下文菜单复制、编辑、重发、重新生成或删除消息
- **移动端优化编辑器** - 响应式输入框，灵活的文本区域、附件标签和清晰的编辑模式指示器
- **长按支持** - 移动设备上通过 500ms 触摸检测快速访问消息操作
- **流畅动画** - 页面过渡动画和路由感知的数据预加载

#### 📝 集成笔记工作区
- 在对话过程中创建和管理笔记
- 置顶重要笔记以便快速访问
- Markdown 编辑 + 预览双模式
- 自动保存并提供未保存提示
- 支持重命名、删除、置顶等上下文操作
- 桌面端分栏显示，移动端抽屉式

#### 🗂️ 对话管理
- **历史记录** - 所有对话自动保存到 IndexedDB
- **置顶对话** - 将重要聊天保持在顶部
- **重命名和删除** - 在历史页集中管理
- **长按操作** - 快速复制、编辑、重发、重新生成或删除消息
- **继续学习** - 在首页一键恢复上次对话
- **预加载导航** - 数据预加载实现即时页面切换

#### 🎨 个性化设置
- **主题切换** - 明亮和暗黑模式，支持系统偏好
- **多语言支持** - 英语（en）、简体中文（zh-CN）、日语（ja）
- **自定义系统提示** - 定义 AI 个性和行为
- **本地存储** - 所有数据存储在浏览器本地（IndexedDB）
- **Toast 通知** - 非侵入式操作反馈

#### 🔒 隐私与安全
- API 密钥本地存储在浏览器中（IndexedDB）
- 无服务器端数据传输
- 完全数据控制，可清除所有数据
- 初次加载后可离线工作
- 无跟踪或分析

### 🧱 架构亮点

#### 🛠️ AI 工具集成
- 内置笔记管理工具，AI 可直接调用
- 可扩展的工具框架
- 支持 Gemini 和 OpenAI 提供商
- 工具注册表、执行器和 schema 定义
 
#### 📱 PWA 移动端优化
- 禁用下拉刷新功能，防止误触
- iOS 安全区域适配
- 优化视口设置
- 增强的触摸滚动体验

#### Provider 组合
- **ToastProvider** - 集中式通知系统
- **SettingsProvider** - 全局设置管理与持久化
- **TranslationProvider** - i18n 支持与语言缓存
- **AppReadyProvider** - 兼容性包装（无启动闸门，立即渲染）
- 所有 Provider 包裹 HashRouter，确保最佳的状态访问和初始化顺序

#### 策略模式
- **apiService.ts** - 统一 API 接口，按配置在 Gemini 与 OpenAI 之间动态切换
- **streamController.ts** - 跨提供商流式控制，支持取消/重试
- **errorHandler.ts** - 集中式错误处理，提供用户友好的错误消息

#### IndexedDB 持久化
- 对话、消息、笔记与设置统一存储
- 支持版本迁移
- 基于事务的操作以确保数据完整性
- 乐观更新以提升用户体验

#### 特性驱动架构
- **Chat 特性** (`features/chat/`) - 覆盖完整聊天体验的 UI、业务逻辑与状态管理
  - UI 组件：ChatHeader、ChatMessagesArea、ChatFooter、NotesPanel
  - 模型层 Hooks：useConversation、useChatStream、useAttachments、useMessageActions
  - 滚动管理与笔记面板状态管理
- **共享 UI 组件** (`shared/ui/`) - 跨特性复用的基础组件
  - ChatInput、MessageBubble、MarkdownRenderer、Modal、ListItemMenu 等
- **全局 Provider** (`app/providers/`) - 应用级状态与上下文
  - useSettings、useTranslation、useToast、AppReadyProvider

#### Hooks 架构
- **业务 Hooks**（位于 `features/chat/model/`）
  - **useConversation** - 对话状态管理、编辑/重发协调与数据库操作
  - **useChatStream** - AI 流式响应处理，支持取消
  - **useAttachments** - 文件附件处理，带压缩与验证
  - **useMessageActions** - 上下文菜单操作（复制、编辑、重发、重新生成、删除）
  - **useChatActions** - 聊天级操作与状态管理
  - **useScrollManagement** - 自动滚动行为
  - **useNotesPanel** - 笔记面板状态管理
- **共享 Hooks**（位于 `shared/hooks/`）
  - **useLongPress** - 触摸友好的长按检测
- **Provider Hooks**（位于 `app/providers/`）
  - **useToast** - Toast 通知管理
  - **useSettings** - 设置上下文与持久化
  - **useTranslation** - i18n hooks 与缓存

#### UI 组件
- **ChatInput** - 统一的输入编辑器，支持编辑模式、附件标签和移动端友好布局
- **MessageBubble** - 可折叠的思考视图、响应式 Markdown 渲染、附件展示
- **ListItemMenu + Modal** - 上下文操作菜单，带有确认流程和键盘焦点管理
- **MarkdownRenderer** - 富 Markdown 渲染，包含语法高亮与数学公式

#### 响应式布局
- **桌面端**：聊天 + 笔记分栏，支持灵活布局
- **移动端**：针对移动体验优化的底部输入区与安全区域留白
- **虚拟化渲染**：使用 @tanstack/react-virtual 高效渲染消息列表
- **自定义滚动条**：匹配主题的样式化滚动条

#### 性能优化
- **即时渲染** - 应用立即渲染，设置与翻译后台加载
- **基于路由的代码分割** - 细粒度的 vendor chunking 避免大包
- **导航期间数据预加载** - 使用 router 层（AnimatedRoutes + routePreloader）智能缓存
- **虚拟滚动** - 使用 @tanstack/react-virtual 高效渲染消息列表
- **图片压缩** - 附件超过大小限制时自动压缩
- **防抖自动保存** - 笔记自动保存，不影响性能
- **按需数学渲染** - 检测到数学表达式时才加载 rehype-katex，KaTeX CSS 全局打包
- **流畅动画** - 580ms 缓动页面过渡，带有等待锚定逻辑防止布局跳变
- **Blob URL 管理** - 自动清理对象 URL 防止内存泄漏
- **自托管资源** - 字体与图标均在本地托管，无外部 CDN

### 🚀 快速开始

#### 前置要求
- **Node.js** v18 或以上（已在 Node.js 18+ 环境验证）
- **npm** 或 **yarn** 包管理器
- **API 密钥**（以下之一）：
  - [Google AI Studio](https://aistudio.google.com/app/apikey)（Gemini）
  - [OpenAI Platform](https://platform.openai.com/api-keys)（OpenAI）
  - 任意 OpenAI 兼容端点

#### 安装步骤

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd heymean-ai-learning-assistant
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置 API 密钥（可选）**
   
   您可以在应用的设置页面配置 API 密钥，或通过环境变量设置：
   
   在根目录创建 `.env.local` 文件：
   ```bash
   # Gemini（可选 - 也可以在应用设置中配置）
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   > **注意**：API 密钥也可以直接在应用的设置页面配置。密钥安全地存储在浏览器的 IndexedDB 中。

4. **运行开发服务器**
   ```bash
   npm run dev
   ```
   
   应用将在 `http://localhost:3000` 上运行

5. **构建生产版本**
   ```bash
   npm run build
   ```
   
   预览生产构建：
   ```bash
   npm run preview
   ```

### 📖 使用指南

#### 首次设置

1. **启动应用**，导航到**设置**（⚙️ 图标）
2. **选择 AI 提供商**：
   - 选择 "Google Gemini" 或 "OpenAI Compatible"
3. **输入 API 密钥**：
   - Gemini：从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取密钥
   - OpenAI：从 [OpenAI Platform](https://platform.openai.com/api-keys) 获取密钥
4. **配置其他设置**（可选）：
   - 自定义系统提示
   - 模型选择（Gemini 2.5 Flash/Pro 或自动获取 OpenAI 模型）
   - 基础 URL（用于自定义 OpenAI 兼容端点）
   - 语言和主题偏好

#### 开始对话

1. **主页**：在输入框中输入您的问题
2. **附加文件**（可选）：点击 📎 图标上传图片、PDF 或文本文件
3. **发送**：按 Enter 或点击发送
4. **查看 AI 思考**：实时观察 AI 的推理过程（可折叠）
5. **继续学习**：提出后续问题深入探讨
6. **编辑消息**：右键或长按任意用户消息即可编辑并重新提交

#### 管理对话

- **查看历史**：点击 📚 图标查看所有过往对话
- **置顶重要聊天**：右键或长按 → "置顶"
- **重命名**：右键或长按 → "重命名"
- **删除**：右键或长按 → "删除"
- **恢复**：点击任意对话继续上次的内容

#### 使用笔记

1. 在聊天界面**切换到笔记选项卡**
2. 在学习过程中**创建笔记**
3. **置顶重要笔记**以便快速查阅
4. **自动保存**：笔记在输入时自动保存
5. **Markdown 预览**：实时查看格式化的笔记

#### 消息操作

- **复制**：将消息内容复制到剪贴板
- **编辑**（用户消息）：修改消息文本和附件后重新提交（会删除后续消息）
- **重发**（用户消息）：不做修改直接重发消息，并删除后续消息
- **重新生成**（AI 消息）：为同一提示生成新响应
- **删除**：从对话中删除消息
- 通过上下文菜单访问（桌面端右键，移动端长按）

### 🏗️ 技术栈

#### 前端框架
- **React 19.2** - 最新 React，支持并发特性
- **TypeScript 5.9** - 类型安全开发
- **Vite 7.1** - 闪电般快速的构建工具
- **React Router 7.9** - 客户端路由（HashRouter）

#### UI 与样式
- **TailwindCSS 4.0** - 实用优先的 CSS 框架
- **@tailwindcss/vite 4.0** - Vite 的 Tailwind 插件
- **@tailwindcss/postcss 4.0** - PostCSS 插件
- **Material Symbols** - 通过 npm 自托管（material-symbols）
- **Inter 字体** - 通过 `@fontsource/inter` 自托管

#### Markdown 与代码渲染
- **react-markdown 10.1** - Markdown 渲染
- **remark-gfm 4.0** - GitHub Flavored Markdown 支持
- **remark-math 6.0** - 数学符号解析
- **rehype-katex 7.0** - LaTeX/KaTeX 渲染
- **react-syntax-highlighter 16.1** - 代码语法高亮

#### 状态管理
- **React Context** - Settings、Translation 和 Toast providers
- **React Hooks** - 用于数据库、流式传输和 UI 逻辑的自定义 hooks

#### 存储与 API
- **IndexedDB** - 所有应用数据的本地持久存储
- **@google/genai 1.28** - Google Gemini SDK
- **fetch API** - OpenAI 兼容端点
- **AI Tools Framework** - 可扩展的 AI 工具调用系统

#### 性能
- **@tanstack/react-virtual 3.13** - 消息列表的虚拟滚动
- **按需插件** - 检测到数学表达式时按需加载 rehype-katex；KaTeX CSS 全局打包，确保一致渲染

### 📁 项目结构

项目采用 **特性分层设计（Feature-Sliced Design, FSD）**架构，更好地实现模块化、可扩展性与可维护性：

```
heymean-ai-learning-assistant/
├── src/
│   ├── app/                    # 应用层
│   │   ├── App.tsx                # 应用根组件
│   │   ├── providers/             # 全局 Provider（Toast、Settings、Translation、AppReady）
│   │   │   ├── AppProviders.tsx      # Provider 组合
│   │   │   ├── useSettings.tsx       # 设置上下文与 hooks
│   │   │   ├── useTranslation.tsx    # i18n 上下文与 hooks
│   │   │   ├── useToast.tsx          # Toast 通知 provider
│   │   │   └── AppReadyProvider.tsx  # 应用初始化包装
│   │   ├── router/                # 路由配置
│   │   │   └── AppRouter.tsx         # 路由设置（含懒加载）
│   │   ├── layout/                # 应用布局组件
│   │   └── assets/                # 全局资源与 CSS
│   │       ├── index.css             # Tailwind 指令与自定义样式
│   │       └── fonts-preload.ts      # 字体预加载
│   ├── features/               # 特性模块（业务逻辑）
│   │   └── chat/                  # 聊天特性
│   │       ├── ui/                   # 特性专用 UI 组件
│   │       │   ├── ChatHeader.tsx       # 聊天页头部
│   │       │   ├── ChatMessagesArea.tsx # 消息列表（虚拟化）
│   │       │   ├── ChatFooter.tsx       # 聊天输入区域
│   │       │   └── NotesPanel.tsx       # 笔记侧边面板
│   │       ├── model/                # 业务逻辑与 hooks
│   │       │   ├── useConversation.tsx  # 对话状态管理
│   │       │   ├── useChatStream.tsx    # AI 流式处理
│   │       │   ├── useAttachments.tsx   # 文件附件处理
│   │       │   ├── useMessageActions.tsx # 消息操作（编辑/删除/重新生成）
│   │       │   ├── useChatActions.ts    # 聊天级操作
│   │       │   ├── useScrollManagement.ts # 自动滚动行为
│   │       │   └── useNotesPanel.ts     # 笔记面板状态
│   │       ├── api/                  # 特性专用 API 调用
│   │       └── lib/                  # 特性专用工具
│   ├── ai/                     # AI 工具与实用程序
│   │   ├── tools/                # AI 功能调用的工具系统
│   │   │   ├── registry.ts         # 工具注册
│   │   │   ├── executors/          # 工具实现
│   │   │   ├── schemas/            # 工具 schemas
│   │   │   └── types.ts            # 工具类型
│   │   └── README.md              # AI 工具文档
│   ├── shared/                 # 共享/可复用资源
│   │   ├── ui/                    # 可复用 UI 组件
│   │   │   ├── ChatInput.tsx         # 带附件的消息输入
│   │   │   ├── MessageBubble.tsx     # 聊天消息显示
│   │   │   ├── MarkdownRenderer.tsx  # Markdown 渲染组件
│   │   │   ├── MarkdownSurface.tsx   # Markdown 包装与样式
│   │   │   ├── CodeBlock.tsx         # 代码语法高亮
│   │   │   ├── NotesView.tsx         # 笔记 CRUD 界面
│   │   │   ├── Modal.tsx             # 确认对话框
│   │   │   ├── ListItemMenu.tsx      # 上下文菜单组件
│   │   │   └── Selector.tsx          # 下拉选择器
│   │   ├── hooks/                 # 可复用 hooks
│   │   │   └── useLongPress.tsx      # 移动端长按检测
│   │   ├── services/              # 核心服务
│   │   │   ├── db.ts                 # IndexedDB 操作
│   │   │   ├── apiService.ts         # 统一 API 服务（Gemini/OpenAI）
│   │   │   ├── streamController.ts   # 流式控制（取消/重试）
│   │   │   └── errorHandler.ts       # 错误处理工具
│   │   │   ├── toolService.ts        # AI 工具调用接口
│   │   ├── lib/                   # 工具函数
│   │   │   ├── constants.ts          # 应用常量
│   │   │   ├── dateHelpers.ts        # 日期格式化
│   │   │   ├── fileHelpers.ts        # 文件压缩与验证
│   │   │   ├── textHelpers.ts        # 文本处理
│   │   │   ├── attachmentHelpers.ts  # 附件预览工具
│   │   │   ├── preload.ts            # 资源预加载
│   │   │   └── preloadPayload.ts     # 导航数据预加载
│   │   └── types/                 # 共享 TypeScript 类型
│   │       ├── index.ts              # 类型定义
│   │       └── global.d.ts           # 全局类型声明
│   ├── pages/                  # 路由级页面组件
│   │   ├── HomePage.tsx           # 首页
│   │   ├── ChatPage.tsx           # 主聊天界面
│   │   ├── HistoryPage.tsx        # 对话历史
│   │   ├── SettingsPage.tsx       # 设置面板
│   │   └── AboutPage.tsx          # 关于页面
│   ├── widgets/                # 复杂复合组件
│   ├── entities/               # 领域实体（预留）
│   ├── ai/                     # AI/Agent 能力（预留）
│   └── workers/                # Web Workers（预留）
├── public/                     # 静态资源
│   ├── locales/                   # 国际化文件
│   │   ├── en.json                   # 英语翻译
│   │   ├── zh-CN.json                # 简体中文
│   │   └── ja.json                   # 日语
│   └── prompt.txt                 # 默认 AI 系统提示
├── index.tsx                   # 应用入口
├── index.html                  # HTML 模板
├── vite.config.ts              # Vite 配置（含路径别名）
├── tailwind.config.ts          # TailwindCSS 配置
├── tsconfig.json               # TypeScript 配置
├── postcss.config.cjs          # PostCSS 配置
├── package.json                # 依赖与脚本
├── ARCHITECTURE.md             # 详细架构文档
└── README.md                   # 本文件
```

#### 路径别名

项目使用路径别名使导入更清晰：

- `@app/*` → `src/app/*`
- `@shared/*` → `src/shared/*`
- `@features/*` → `src/features/*`
- `@pages/*` → `src/pages/*`
- `@widgets/*` → `src/widgets/*`
- `@entities/*` → `src/entities/*`
- `@ai/*` → `src/ai/*`
- `@workers/*` → `src/workers/*`

#### 架构原则

- **特性优先**：业务逻辑按特性组织，而非技术分层
- **共享资源**：通用 UI 组件、hooks 与工具放在 `shared/`
- **清晰依赖**：下层（`shared`）不依赖上层（`features`、`pages`）
- **懒加载**：路由与特性按需加载以提升性能
- **关注点分离**：UI、业务逻辑与数据访问明确分离

详细架构指南请参阅 [ARCHITECTURE.md](ARCHITECTURE.md)。


### 🌐 国际化

当前支持的语言：

| 语言 | 代码 | 状态 |
|----------|------|--------|
| English | `en` | ✅ 完全支持 |
| 简体中文 | `zh-CN` | ✅ 完全支持 |
| 日本語 | `ja` | ✅ 完全支持 |

添加新语言：
1. 在 `public/locales/` 中创建新的 JSON 文件（例如 `public/locales/es.json`）
2. 将语言添加到 `src/shared/types/index.ts` 的 Language 枚举
3. 更新 `src/pages/SettingsPage.tsx` 中的语言选择器
4. 翻译 `public/locales/en.json` 中的所有键

### 🔧 配置

#### 环境变量

正常使用无需任何环境变量。请在应用内的设置页配置 API 密钥。仅在高级自定义场景下才需要使用 Vite 环境变量。

#### 自定义系统提示

1. **应用内**：进入设置 → 模型设置 → 系统提示
2. **基于文件**：编辑 `public/prompt.txt`（通过 `/prompt.txt` 提供）

#### OpenAI 兼容端点

在设置中配置自定义端点：
- **基础 URL**：例如 `https://api.openai.com/v1` 或您的自定义端点
- **API 密钥**：您的 OpenAI 或兼容 API 密钥
- **获取模型**：自动从端点检索可用模型
- **模型选择**：从获取的模型中选择或手动输入

### 🚢 部署

应用可以部署到任何静态托管服务：

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm run build
# 将 dist/ 文件夹上传到 Netlify
```

#### GitHub Pages
```bash
npm run build
# 将 dist/ 文件夹部署到 GitHub Pages
```

> **注意**：部署时，确保使用 HashRouter（已配置），以便在无需服务器端配置的情况下正确路由。

### 🛠️ 开发

#### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:3000）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

#### 代码风格

本项目使用：
- **TypeScript** 以确保类型安全
- **React 19** 特性（hooks、context、并发特性）
- **函数组件**与 hooks（无类组件）
- **ES6+ 语法**（async/await、箭头函数、解构）
- **TailwindCSS** 用于样式（实用优先方法）

#### 关键开发指南

- 遵循现有代码模式和组件结构
- 为所有新代码添加 TypeScript 类型
- 使用 Gemini 和 OpenAI 提供商进行测试
- 更新所有支持语言的翻译（en、zh-CN、ja）
- 确保响应式设计在移动端和桌面端都能正常工作
- 使用自定义 hooks 实现可复用逻辑
- 利用 IndexedDB 存储所有持久数据

### 🤝 贡献

欢迎贡献！以下是您可以提供帮助的方式：

1. **Fork 仓库**
2. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **提交更改**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **推送到分支**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **打开 Pull Request**

#### 开发指南

- 遵循现有代码风格和模式
- 为所有新代码添加 TypeScript 类型
- 使用 Gemini 和 OpenAI 提供商进行测试
- 更新所有支持语言的翻译
- 确保响应式设计在移动端正常工作
- 编写有意义的提交消息
- 根据需要更新文档

### 📝 许可证

本项目根据 GNU Affero 通用公共许可证 v3.0（AGPL-3.0）授权 - 有关详细信息，请参阅 [LICENSE](LICENSE) 文件。

### 🙏 致谢

- **Google Gemini** 提供强大的 AI 功能
- **OpenAI** 提供 GPT API 标准
- **React 团队** 提供出色的框架
- **Vite 团队** 提供闪电般快速的构建工具
- **TailwindCSS** 提供实用优先的 CSS 框架
- 所有开源贡献者，他们的库使这个项目成为可能

### 📧 支持

- **GitHub 仓库**：[https://github.com/CJackHwang/HeyMean](https://github.com/CJackHwang/HeyMean)
- **问题反馈**：通过 GitHub Issues 报告错误或请求功能
- **AI Studio**：[查看应用](https://ai.studio/apps/drive/1FrpJ1oHeY4gveHbT1iJn3y7TvmEbmecR)

---

<div align="center">

**用 ❤️ 为世界各地的学习者制作**

⭐ **如果您觉得有帮助，请给这个仓库加星！**

</div>
