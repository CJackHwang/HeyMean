项目架构目标与规范（HeyMean）

**版本定位**
- 当前阶段：核心是“基于 API 的日常对话”（Chat）。
- 后续阶段：基于 API 的工作流 Agent（独立高级功能，后期引入）。
- 目标：保证当前迭代效率，同时为高级功能预留清晰边界与扩展点。

**总体目标**
- 特性优先（Feature-First）：业务内聚、边界清晰、可变更成本低。
- 分层清楚：通用层与业务层解耦，Agent 与日常对话分离。
- 渐进迁移：允许按文件夹/模块小步重构，随时保持可运行。
- 性能可控：路由/功能级懒加载，重计算可下沉到 Worker。

**目录结构蓝图**
- src/app
  - providers/ 全局 Provider 组合（Toast/Settings/Translation/Theme/Query 等）
  - router/ 路由定义、守卫与懒加载封装
  - layout/ 顶层布局（Shell/Sidebar/Header）
  - assets/ 全局静态与预加载（如 fonts-preload.ts）
  - App.tsx 应用壳，薄层引导
- src/shared（业务无关、平台相关性可有）
  - ui/ 基础可复用 UI（Modal、ListItemMenu 等）
  - hooks/ 通用 Hooks（无业务语义）
  - lib/ 纯工具（preloadPayload、format、storage、event-bus 等）
  - api/ HTTP 客户端、拦截器、通用 schema/validator（可选）
  - services/ 与平台相关但无业务语义（db、errorHandler、logger）
  - types/ 通用类型定义（基础 DTO、Result 等）
- src/entities（领域实体，跨特性共享）
  - message/ conversation/ user/ ...
  - 每实体可含：model/（types/normalizers）、api/（CRUD）、ui/（轻展示）
- src/features（业务特性，面向具体用户任务）
  - chat/
    - ui/ 组件（ChatHeader、ChatMessagesArea、ChatFooter、NotesPanel）
    - model/ 业务状态与 Hooks（useConversation、useChatStream、useMessageActions）
    - api/ 与 Chat 相关的请求/DB 封装
    - lib/ 纯逻辑工具（滚动、解析、虚拟列表辅助）
  - notes/ ...（按需新增）
- src/widgets（跨页面复用的复合区块，含业务语义，但非基础 UI）
  - sidebar/ topbar/ notes-panel/ ...
- src/pages（路由级页面，薄拼装层）
  - ChatPage.tsx 等，仅做特性/部件组合，不下沉业务逻辑
- src/ai（后期 Agent 能力预留，当前不开发）
  - clients/ 统一 LLM 客户端封装（可多厂商）
  - tools/ 工具定义与注册（schema/执行器/权限）
  - mcp/ MCP 连接器、能力声明、资源管理
  - agents/ Agent 运行时（planner/memory/runtime）
  - adapters/ 浏览器/Worker/Service 适配
  - prompts/ Prompt 模板与片段
- src/workers（Web/Service/Shared Worker 入口及逻辑）
- public/ 静态资源、manifest、SW 等

注：当前仓库已有的目录与文件在迁移中按“就近内聚”原则并入以上结构；迁移顺序见文末“渐进迁移清单”。

**分层依赖原则**
- shared 最底层：可被任何层使用，但不得反向依赖上层。
- entities 依赖 shared，不依赖 features/widgets/pages。
- features 依赖 shared、entities；避免特性间直接耦合（通过 entities 抽象共享）。
- widgets 可依赖 features/entities/shared，但不被 features 反向依赖。
- pages 只做拼装与路由，不承载业务逻辑。
- ai 与日常对话分离：features 不直接依赖 ai/agents；如需调用，通过明确的 Facade/接口层对接（例如在 shared/services 暴露受限接口，或在 features 的 api 层注入实现）。

**路径别名约定（tsconfig 与 vite 一致）**
- `@app/* -> src/app/*`
- `@shared/* -> src/shared/*`
- `@entities/* -> src/entities/*`
- `@features/* -> src/features/*`
- `@widgets/* -> src/widgets/*`
- `@pages/* -> src/pages/*`
- `@ai/* -> src/ai/*`
- `@workers/* -> src/workers/*`

建议逐步替换深层相对路径为别名路径，提升可读性与重构安全性。

**路由、布局与 Provider**
- 在 `src/app/providers/AppProviders.tsx` 收拢所有全局 Provider，`App.tsx` 保持极薄。
- 在 `src/app/router/` 定义路由，应用路由守卫（权限/初始化检查），并对页面实施懒加载。
- 页面级布局（Shell/Sidebar/Header）放在 `src/app/layout/`，业务区块放 `widgets/` 或 `features/*/ui`。

**状态管理与数据访问**
- 以函数式 Hooks 为主，业务状态集中在对应 `features/*/model/` 中；避免页面直接处理业务状态。
- 异步数据建议集中在 `api/`（features 内或 shared/api），hooks 仅组合与订阅。
- 如引入 TanStack Query：在 `app/providers` 注入 QueryClient；查询/变更在 `features/*/api` 实现。
- 更复杂状态可考虑 Zustand/Jotai/XState，但封装在 `model/` 层，屏蔽实现细节。

**UI 分层规范**
- `shared/ui`：纯通用基础组件（无业务语义），尽量可移植。
- `widgets`：跨页面复用的复合区块（含业务语义，但不直接依赖具体页面）。
- `features/*/ui`：特性内的 UI 组件，耦合该特性模型与流程。
- 页面（`pages`）只做组件组合与路由控制，不放业务状态与副作用。

**Hooks 规范**
- 命名以 `useXxx` 开头；通用 hooks 放 `shared/hooks`，业务 hooks 放对应 `features/*/model`。
- 副作用位置：业务副作用集中在 `model`；UI 尽量无副作用。
- 导出通过该目录的 `index.ts`（barrel 出口）统一暴露，便于重构与可见性控制。

**类型与边界**
- 通用基础类型：`shared/types`；领域模型：`entities/*/model`。
- API DTO 与 Domain 类型分离：请求/响应 DTO 在 `api`，领域类型在 `model` 或 `entities`。
- 需要校验时（可选）引入 Zod/Valibot，放在对应 `api/schemas`。

**API 通信与错误处理**
- 在 `shared/api` 放置 HTTP 客户端/拦截器，或在各特性 `api/` 封装请求函数。
- 错误标准化与用户提示解耦：`shared/services/errorHandler` 负责标准化，UI 通过 Toast 等展示。
- 本地存储/IndexedDB 封装在 `shared/services/db`，由特性 `api/` 使用。

**构建与性能策略**
- 保持路由与特性入口懒加载；大依赖（如 Markdown/LLM SDK/虚拟列表）按包分离为独立 chunk。
- 对重计算（解析/索引/Embedding 等），可迁至 `workers`，与主线程解耦。
- 图片与字体走现代格式（WebP/woff2），关键字体在 `app/assets` 早期预加载。

**PWA / Service Worker**
- 保持当前最小化注册；若后续离线化增强，建议使用 Workbox 或细分缓存策略（静态/接口/模型）。
- 对大模型/词典类资源采用分层缓存并提供版本控制机制。

**测试策略**
- 单元测试靠近实现：在相应目录下使用 `__tests__` 或 `*.test.tsx`。
- 端到端测试（如 Playwright）放 `tests/e2e/`，覆盖：对话流、路由守卫、工具调用关键路径。
- 类型/ESLint/构建在 CI 中强制执行，保障结构调整的安全性。

**渐进迁移清单（建议顺序）**
- 第1步：添加路径别名与骨架目录（不移动代码，先保证构建通过）。
- 第2步：在 `app/providers` 收拢 Provider，`App.tsx` 精简为壳。
- 第3步：将 `App.tsx` 与 `navigation/AnimatedRoutes.tsx` 迁入 `src/app`（分 `App.tsx`、`router/`）。
- 第4步：把通用组件迁往 `shared/ui`；`utils/preloadPayload.ts` 迁往 `shared/lib`。
- 第5步：将 `pages/chat/*` 内聚为 `features/chat/*`（ui/model/api/lib），`pages/ChatPage.tsx` 保持薄层拼装。
- 第6步：建立 `src/ai` 目录骨架（clients/tools/mcp/agents/adapters/prompts），暂不引入到应用流程。
- 每步后均跑构建/预览并修正导入路径，确保“随时可上线”。

**Agent 预留约定（当前不开发）**
- 目录：`src/ai`，由以下子结构组成：
  - `clients/`：统一多厂商 LLM Client 接口；
  - `tools/`：工具 schema/执行器/权限与注册中心；
  - `mcp/`：MCP 连接与能力发现；
  - `agents/`：规划/记忆/运行时；
  - `adapters/`：浏览器/Worker 等环境适配；
  - `prompts/`：Prompt 模板与片段管理。
- 边界：
  - 日常对话特性（`features/chat`）不直接依赖 `src/ai`；
  - 若需要对接 Agent，先在 `shared/services` 定义 Facade 接口，再由 `ai` 实现，最后注入到特性层；
  - Agent 的依赖与体积通过动态 import 与独立 chunk 管理，避免污染基础对话体验。

**与现有代码的映射建议（示例）**
- `App.tsx` -> `src/app/App.tsx`；`navigation/AnimatedRoutes.tsx` -> `src/app/router/`。
- `components/*`（通用）-> `src/shared/ui/*`。
- `pages/chat/components/*` -> `src/features/chat/ui/*`。
- `pages/chat/hooks/*` -> `src/features/chat/model/*`。
- `utils/preloadPayload.ts` -> `src/shared/lib/preloadPayload.ts`。
- `services/*` -> `src/shared/services/*`（或按实体/特性归位）。
- `types.ts` -> `src/shared/types/*`（或按实体拆分到 `src/entities`）。

**附：别名与导入示例**
- 页面导入：`import ChatPage from '@pages/ChatPage'`
- 特性导入：`import { useConversation } from '@features/chat/model'`
- 通用 UI：`import Modal from '@shared/ui/Modal'`
- 服务/工具：`import { getPayload } from '@shared/lib/preloadPayload'`
- Agent（后期）：`const agent = await import('@ai/agents/runtime')`

本规范旨在统一认知、降低协作与重构成本；如有新增特性或平台扩展（桌面/插件），可在此蓝图基础上延伸（如 Monorepo 与包内聚）。

