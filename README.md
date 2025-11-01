<div align="center">
<img width="1200" height="475" alt="HeyMean Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 何意味 (HeyMean) 

**AI Learning Assistant - Making Learning an Addiction, Not a Chore**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[View in AI Studio](https://ai.studio/apps/drive/1FrpJ1oHeY4gveHbT1iJn3y7TvmEbmecR) | [English](#english) | [中文](#中文)

</div>

---

<a id="english"></a>

## ✨ Features

### 🤖 Multi-AI Provider Support
- **Google Gemini** - Full feature support including PDF analysis
- **OpenAI Compatible APIs** - Support for OpenAI and compatible endpoints (e.g., Azure OpenAI, local models)
- Automatic model fetching from OpenAI-compatible endpoints
- Custom base URL configuration

### 💬 Intelligent Chat Interface
- **Rich Message Display** - Markdown rendering with syntax highlighting (powered by react-syntax-highlighter)
- **Mathematical Expressions** - LaTeX/KaTeX support via remark-math and rehype-katex
- **File Attachments** - Attach up to 4 files (≤5 MB each), covering images (PNG/JPG/GIF/WebP), plain-text/Markdown, and PDFs (Gemini only) with intelligent compression
- **Thinking Process Display** - Visualize AI reasoning steps in real-time with collapsible sections
- **Streaming Responses** - See AI responses as they're generated with real-time typing effect
- **Message Actions** - Copy, resend, regenerate, and delete messages with context menu

### 📝 Integrated Notes Workspace
- Create and manage notes alongside your conversations
- Pin important notes for quick access
- Full Markdown support with live preview
- Auto-save functionality with unsaved changes detection
- Rename and organize notes with context menu

### 🗂️ Conversation Management
- **History Tracking** - All conversations automatically saved to IndexedDB
- **Pin Conversations** - Keep important chats at the top
- **Rename & Delete** - Organize your learning journey from the history page
- **Long-Press Actions** - Access copy/resend/regenerate/delete from chat history
- **Continue Where You Left Off** - Resume your last conversation instantly from the home screen

### 🎨 Personalization
- **Theme Switching** - Light and dark modes
- **Multi-language Support** - English, 简体中文 (Simplified Chinese), 日本語 (Japanese)
- **Custom System Prompts** - Define AI personality and behavior
- **Local Storage** - All data stored locally in your browser (IndexedDB)

### 🔒 Privacy & Security
- API keys stored locally in browser
- No server-side data transmission
- Complete data control with clear all data option
- Works offline after initial load

---

## 🧱 Architecture Highlights
- **Provider Composition** — SettingsProvider + TranslationProvider wrap the router for global state
- **Strategy Pattern** — `apiService.ts` dispatches between Gemini and OpenAI implementations
- **IndexedDB Persistence** — Conversations, messages, notes, and settings stored locally with schema migrations
- **Modular Hooks** — Reusable hooks (`useConversation`, `useChatStream`, `useAttachments`) encapsulate complex flows
- **Responsive Layout** — Chat + Notes split view on desktop, drawer-based experience on mobile

---

## 🌿 Branch Strategy (Main ↔ Canary)

We maintain two long-lived branches to balance stability and rapid iteration:

- `main` — the stable release line used for production deployments.
- `canary` — the experimental/bleeding-edge line where aggressive changes land first.

### Creating the Canary branch from main

```bash
git checkout main
git pull origin main
git checkout -b canary
git push -u origin canary
```

### Keeping `canary` in sync with `main`

```bash
git checkout main
git pull
git checkout canary
git merge main    # or: git rebase main
```

> Ship features through `canary` first, validate them, and then fast-forward `main` once they are ready for general availability.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **API Key** from one of:
  - [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini)
  - [OpenAI Platform](https://platform.openai.com/api-keys) (OpenAI)

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

3. **Configure API Key (Optional)**
   
   You can configure your API key in the app's Settings page, or set it via environment variable:
   
   Create a `.env.local` file in the root directory:
   ```bash
   # For Gemini (optional - can also be set in app settings)
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   > **Note**: API keys can also be configured directly in the app's Settings page. Keys are stored securely in your browser's IndexedDB.

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
   - Model selection (for OpenAI)
   - Base URL (for custom endpoints)
   - Language and theme preferences

### Starting a Conversation

1. **Home page**: Enter your question in the input field
2. **Attach files** (optional): Click the 📎 icon to upload images or PDFs
3. **Send**: Press Enter or click Send
4. **View AI thinking**: Watch the AI's reasoning process in real-time
5. **Continue learning**: Ask follow-up questions to dive deeper

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

---

## 🏗️ Tech Stack

### Frontend Framework
- **React 19.2** - Latest React with concurrent features
- **TypeScript 5.8** - Type-safe development
- **Vite 6.2** - Lightning-fast build tool
- **React Router 7.9** - Client-side routing with HashRouter

### UI & Rendering
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown support
- **remark-math & rehype-katex** - Mathematical expressions
- **react-syntax-highlighter** - Code syntax highlighting

### State Management
- **React Context** - Settings and Translation providers
- **React Hooks** - Custom hooks for DB and translations

### Storage & APIs
- **IndexedDB** - Local persistent storage
- **@google/genai** - Google Gemini SDK
- Native **fetch API** - OpenAI-compatible endpoints

---

## 📁 Project Structure

```
heymean-ai-learning-assistant/
├── components/          # Reusable UI components
│   ├── ChatInput.tsx       # Message input with file upload
│   ├── MessageBubble.tsx   # Chat message display
│   ├── MarkdownRenderer.tsx # Rich markdown rendering
│   ├── NotesView.tsx       # Notes workspace with full CRUD
│   ├── Modal.tsx           # Confirmation dialogs
│   ├── ListItemMenu.tsx    # Context menu for list items
│   └── Selector.tsx        # Dropdown selector component
├── pages/              # Route pages
│   ├── HomePage.tsx        # Landing page with quick start
│   ├── ChatPage.tsx        # Main chat interface with streaming
│   ├── HistoryPage.tsx     # Conversation history management
│   └── SettingsPage.tsx    # Settings panel with API config
├── services/           # Business logic
│   ├── db.ts               # IndexedDB operations (conversations, messages, notes, settings)
│   └── apiService.ts       # Unified API service (Gemini + OpenAI compatible)
│   └── streamController.ts # Cross-provider streaming control (cancel/retry)
├── hooks/              # Custom React hooks
│   ├── useSettings.tsx     # Settings context & provider
│   ├── useTranslation.tsx  # i18n hooks with caching
│   ├── useConversation.tsx # Conversation state management
│   ├── useChatStream.tsx   # AI streaming response handler (supports cancel)
│   ├── useAttachments.tsx  # File attachment handling
│   └── useMessageActions.tsx # Message action handlers (resend, regenerate, delete)
├── locales/            # Internationalization
│   ├── en.json             # English translations
│   ├── zh-CN.json          # Simplified Chinese
│   └── ja.json             # Japanese
├── App.tsx             # App root with providers and router
├── index.tsx           # App entry point
├── types.ts            # TypeScript type definitions
├── prompt.txt          # Default AI system prompt
├── vite.config.ts      # Vite configuration
└── index.html          # HTML template with CDN imports
```

---

## 🌐 Internationalization

Currently supported languages:

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Fully supported |
| 简体中文 | `zh-CN` | ✅ Fully supported |
| 日本語 | `ja` | ✅ Fully supported |

To add a new language:
1. Create a new JSON file in `locales/` (e.g., `locales/es.json`)
2. Add the language to `types.ts` Language enum
3. Update the language selector in `SettingsPage.tsx`

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (optional):

```bash
# Gemini API Key (optional - can be set in app settings)
GEMINI_API_KEY=your_gemini_api_key

# Other Vite environment variables
# PORT=3000
```

### Customizing the System Prompt

1. **In-app**: Go to Settings → Model Settings → System Prompt
2. **File-based**: Edit `prompt.txt` in the root directory (default prompt)

### OpenAI-Compatible Endpoints

Configure custom endpoints in Settings:
- **Base URL**: e.g., `https://api.openai.com/v1` or your custom endpoint
- **Model Name**: e.g., `gpt-4o`, `gpt-3.5-turbo`, or your model identifier
- **Fetch Models**: Automatically retrieve available models from endpoint

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
- **TypeScript** for type safety
- **React 19** features (hooks, context, concurrent features)
- **Functional components** with hooks (no class components)
- **ES6+ syntax** (async/await, arrow functions, destructuring)

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

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** for powerful AI capabilities
- **OpenAI** for the GPT API standard
- **React Team** for the amazing framework
- **Vite Team** for the blazing-fast build tool
- All open-source contributors whose libraries made this possible

---

## 📧 Support

- **Issues**: [GitHub Issues](../../issues)
- **Discussions**: [GitHub Discussions](../../discussions)
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
- **Google Gemini** - 完整功能支持，包括 PDF 分析
- **OpenAI 兼容 API** - 支持 OpenAI 及兼容端点（如 Azure OpenAI、本地模型）
- 自动从端点获取可用模型
- 自定义基础 URL 配置

#### 💬 智能对话界面
- **富文本消息** - Markdown 渲染，语法高亮
- **数学表达式** - LaTeX/KaTeX 支持
- **文件附件** - 最多支持 4 个文件（≤5 MB），涵盖图片（PNG/JPG/GIF/WebP）、纯文本/Markdown，PDF 仅限 Gemini，并自动压缩图片
- **思考过程展示** - 可折叠的 AI 推理过程，实时查看
- **流式响应** - 实时查看 AI 生成的回复，具有动态输出效果
- **消息操作** - 长按即可复制、重发、重新生成或删除消息

#### 📝 集成笔记工作区
- 在对话过程中创建和管理笔记
- 置顶重要笔记以便快速访问
- Markdown 编辑 + 预览双模式
- 自动保存并提供未保存提示
- 支持重命名、删除、置顶等上下文操作

#### 🗂️ 对话管理
- **历史记录** - 所有对话自动保存到 IndexedDB
- **置顶对话** - 将重要聊天保持在顶部
- **重命名和删除** - 在历史页集中管理
- **长按操作** - 快速复制、重发、重新生成或删除消息
- **继续学习** - 在首页一键恢复上次对话

#### 🎨 个性化设置
- **主题切换** - 明亮和暗黑模式
- **多语言支持** - 英语、简体中文、日语
- **自定义系统提示** - 定义 AI 个性和行为
- **本地存储** - 所有数据存储在浏览器本地（IndexedDB）

#### 🔒 隐私与安全
- API 密钥本地存储在浏览器中
- 无服务器端数据传输
- 完全数据控制，可清除所有数据
- 初次加载后可离线工作

### 🧱 架构亮点
- **Provider 组合** —— SettingsProvider 与 TranslationProvider 包裹路由，统一管理全局状态
- **策略模式** —— `apiService.ts` 按配置在 Gemini 与 OpenAI 之间动态切换
- **IndexedDB 持久化** —— 对话、消息、笔记与设置统一存储，支持版本迁移
- **模块化 Hooks** —— `useConversation`、`useChatStream`、`useAttachments` 等封装复杂流程
- **响应式布局** —— 桌面端聊天 + 笔记分栏，移动端则采用抽屉式交互

### 🌿 分支策略（Main ↔ Canary）

仓库长期维护两个主分支，以兼顾稳定与激进尝鲜：

- `main` —— 稳定发布分支，用于线上环境。
- `canary` —— 激进实验分支，率先集成新特性和大改动。

#### 如何从 main 创建 `canary` 分支

```bash
git checkout main
git pull origin main
git checkout -b canary
git push -u origin canary
```

#### 如何同步 `canary` 的最新内容

```bash
git checkout main
git pull
git checkout canary
git merge main    # 如需线性历史，可改用：git rebase main
```

> 建议先在 `canary` 分支验证重大变更，稳定后再合并回 `main`，以确保线上体验质量。

### 🚀 快速开始

#### 前置要求
- **Node.js**（推荐 v18 或更高版本）
- **npm** 或 **yarn**
- 以下之一的 **API 密钥**：
  - [Google AI Studio](https://aistudio.google.com/app/apikey)（Gemini）
  - [OpenAI Platform](https://platform.openai.com/api-keys)（OpenAI）

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
   
   你可以在应用的设置页面配置 API 密钥，或通过环境变量设置：
   
   在根目录创建 `.env.local` 文件：
   ```bash
   # Gemini API 密钥（可选 - 也可在应用设置中配置）
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   > **注意**：API 密钥也可以直接在应用的设置页面配置。密钥安全存储在浏览器的 IndexedDB 中。

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   应用将在 `http://localhost:3000` 可访问

5. **生产构建**
   ```bash
   npm run build
   ```
   
   预览生产构建：
   ```bash
   npm run preview
   ```

### 📖 使用指南

#### 首次设置

1. **启动应用**并导航到**设置**（⚙️ 图标）
2. **选择 AI 提供商**：
   - 选择"Google Gemini"或"OpenAI Compatible"
3. **输入 API 密钥**：
   - Gemini：从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取
   - OpenAI：从 [OpenAI Platform](https://platform.openai.com/api-keys) 获取
4. **配置其他设置**（可选）：
   - 自定义系统提示
   - 模型选择（OpenAI）
   - 基础 URL（自定义端点）
   - 语言和主题偏好

#### 开始对话

1. **主页**：在输入框中输入你的问题
2. **附加文件**（可选）：点击 📎 图标上传图片或 PDF
3. **发送**：按 Enter 或点击发送
4. **查看 AI 思考**：实时观察 AI 的推理过程
5. **继续学习**：提出后续问题深入探索

#### 管理对话

- **查看历史**：点击 📚 图标查看所有过往对话
- **置顶重要对话**：右键或长按 → "置顶"
- **重命名**：右键或长按 → "重命名"
- **删除**：右键或长按 → "删除"
- **恢复**：点击任何对话继续学习

#### 使用笔记

1. 在聊天界面**切换到笔记标签**
2. 学习时**创建笔记**
3. **置顶重要笔记**以便快速参考
4. **自动保存**：笔记会在输入时自动保存

### 🏗️ 技术栈

- **React 19.2** - 最新的 React 并发特性
- **TypeScript 5.8** - 类型安全开发
- **Vite 6.2** - 极速构建工具
- **React Router 7.9** - 客户端路由
- **IndexedDB** - 本地持久化存储
- **@google/genai** - Google Gemini SDK
- **react-markdown** - Markdown 渲染
- **react-syntax-highlighter** - 代码语法高亮

### 📧 支持

- **问题反馈**：[GitHub Issues](../../issues)
- **讨论区**：[GitHub Discussions](../../discussions)
- **AI Studio**：[查看应用](https://ai.studio/apps/drive/1FrpJ1oHeY4gveHbT1iJn3y7TvmEbmecR)

---

<div align="center">

**用 ❤️ 为全球学习者打造**

⭐ **觉得有帮助就给个 Star 吧！**

</div>
