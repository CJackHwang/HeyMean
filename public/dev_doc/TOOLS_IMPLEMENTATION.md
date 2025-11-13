# AI Tools Function Calling Implementation

## 概述

本项目已实现完整的AI工具函数调用功能，允许AI在聊天过程中调用工具来执行操作（如创建、查看、修改笔记）。该实现预留了复用接口，可供未来的智能体（agent）工作流使用。

## 架构设计

### 核心组件

```
src/
├── ai/                           # AI能力层（新增）
│   ├── tools/                    # 工具系统
│   │   ├── types.ts             # 工具类型定义
│   │   ├── registry.ts          # 工具注册器
│   │   ├── schemas/             # 工具Schema定义
│   │   │   ├── noteTools.ts    # 笔记工具Schema
│   │   │   └── index.ts
│   │   ├── executors/           # 工具执行器
│   │   │   ├── noteTools.ts    # 笔记工具实现
│   │   │   └── index.ts
│   │   ├── index.ts
│   │   ├── README.md            # 工具系统说明
│   │   └── USAGE.md             # 使用指南
│   └── index.ts
└── shared/
    └── services/
        ├── toolService.ts       # 统一工具服务接口（新增）
        └── apiServiceWithTools.ts # 带工具支持的API服务（新增）
```

### 设计原则

1. **分层设计**: 工具定义(schemas) 与 工具执行(executors) 分离
2. **提供商无关**: 自动转换为不同AI提供商的格式（Gemini/OpenAI）
3. **可复用**: 统一接口支持聊天和未来的agent工作流
4. **类型安全**: 完整的TypeScript类型支持
5. **可扩展**: 易于添加新工具

## 实现功能

### 1. 笔记工具（6个）

#### createNote - 创建笔记
```typescript
{
  name: 'createNote',
  description: '创建一个新笔记',
  parameters: {
    title: { type: 'string', required: true },
    content: { type: 'string', required: true }
  }
}
```

#### getNote - 获取笔记
```typescript
{
  name: 'getNote',
  description: '根据ID获取特定笔记',
  parameters: {
    id: { type: 'number', required: true }
  }
}
```

#### listNotes - 列出笔记
```typescript
{
  name: 'listNotes',
  description: '列出所有笔记或分页获取笔记',
  parameters: {
    limit: { type: 'number', required: false },
    offset: { type: 'number', required: false }
  }
}
```

#### updateNote - 更新笔记
```typescript
{
  name: 'updateNote',
  description: '更新现有笔记',
  parameters: {
    id: { type: 'number', required: true },
    title: { type: 'string', required: false },
    content: { type: 'string', required: false }
  }
}
```

#### searchNotes - 搜索笔记
```typescript
{
  name: 'searchNotes',
  description: '在标题和内容中搜索笔记',
  parameters: {
    query: { type: 'string', required: true }
  }
}
```

#### deleteNote - 删除笔记
```typescript
{
  name: 'deleteNote',
  description: '根据ID删除笔记',
  parameters: {
    id: { type: 'number', required: true }
  }
}
```

### 2. 工具注册系统

`toolRegistry` 单例管理所有可用工具：

```typescript
import { toolRegistry } from '@ai/tools/registry';

// 获取所有工具定义
const tools = toolRegistry.getAllDefinitions();

// 获取特定工具
const tool = toolRegistry.getTool('createNote');

// 获取工具执行器
const executor = toolRegistry.getExecutor('createNote');

// 注册新工具
toolRegistry.register(toolDefinition, executorFunction);
```

### 3. 统一工具服务

`toolService` 提供跨提供商的统一接口：

```typescript
import { 
  getToolsForProvider, 
  executeTool 
} from '@shared/services/toolService';

// 获取Gemini格式的工具
const geminiTools = getToolsForProvider(ApiProvider.GEMINI);
// 返回: GeminiFunctionDeclaration[]

// 获取OpenAI格式的工具
const openaiTools = getToolsForProvider(ApiProvider.OPENAI);
// 返回: OpenAIFunctionDefinition[]

// 执行工具
const result = await executeTool({
  name: 'createNote',
  parameters: { title: 'Test', content: 'Content' }
});
```

### 4. 格式转换

自动将工具定义转换为不同提供商的格式：

#### Gemini Format
```json
{
  "name": "createNote",
  "description": "创建新笔记",
  "parameters": {
    "type": "object",
    "properties": {
      "title": { "type": "string", "description": "..." },
      "content": { "type": "string", "description": "..." }
    },
    "required": ["title", "content"]
  }
}
```

#### OpenAI Format
```json
{
  "type": "function",
  "function": {
    "name": "createNote",
    "description": "创建新笔记",
    "parameters": {
      "type": "object",
      "properties": {
        "title": { "type": "string", "description": "..." },
        "content": { "type": "string", "description": "..." }
      },
      "required": ["title", "content"]
    }
  }
}
```

## 使用方式

### 在AI聊天中使用（当前实现）

```typescript
// 1. 导入工具服务
import { getToolsForProvider } from '@shared/services/toolService';

// 2. 获取工具列表
const tools = getToolsForProvider(ApiProvider.GEMINI);

// 3. 在API请求中包含工具
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: '帮我创建一个会议笔记',
  config: {
    tools: [{ functionDeclarations: tools }]
  }
});

// 4. 处理工具调用
if (response.functionCalls) {
  for (const call of response.functionCalls) {
    const result = await executeTool({
      name: call.name,
      parameters: call.args || {}
    });
    // 处理结果...
  }
}
```

### 为未来Agent预留的接口

```typescript
// Agent可以使用相同的工具系统
import { toolRegistry } from '@ai/tools/registry';

class MyAgent {
  async planAndExecute(task: string) {
    // 1. 获取所有可用工具
    const tools = toolRegistry.getAllDefinitions();
    
    // 2. Agent规划使用哪些工具
    const plan = await this.createPlan(task, tools);
    
    // 3. 执行工具
    for (const step of plan) {
      const executor = toolRegistry.getExecutor(step.toolName);
      if (executor) {
        const result = await executor(step.parameters);
        // 处理结果...
      }
    }
  }
}
```

### 直接测试工具

```typescript
import { executeTool } from '@shared/services/toolService';

// 创建笔记
const createResult = await executeTool({
  name: 'createNote',
  parameters: {
    title: '测试笔记',
    content: '这是测试内容'
  }
});

console.log('创建结果:', createResult);
// { success: true, data: { id: 123, title: '测试笔记', ... } }

// 搜索笔记
const searchResult = await executeTool({
  name: 'searchNotes',
  parameters: { query: '测试' }
});

console.log('搜索结果:', searchResult);
// { success: true, data: { notes: [...], found: 1 } }
```

## 工具结果格式

所有工具返回统一的结果格式：

```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;    // 成功时返回
  error?: string;    // 失败时返回错误信息
}
```

### 成功示例
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "我的笔记",
    "content": "笔记内容",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 失败示例
```json
{
  "success": false,
  "error": "Note with id 999 not found"
}
```

## 扩展新工具

### 1. 定义Schema

在 `src/ai/tools/schemas/` 创建新文件：

```typescript
// myTools.ts
import { ToolDefinition } from '../types';

export const myNewTool: ToolDefinition = {
  name: 'myNewTool',
  description: '工具描述',
  parameters: {
    param1: {
      type: 'string',
      description: '参数描述',
      required: true,
    },
  },
  requiredParams: ['param1'],
};
```

### 2. 实现执行器

在 `src/ai/tools/executors/` 创建对应文件：

```typescript
// myTools.ts
import { ToolExecutor, ToolResult } from '../types';

export const executeMyNewTool: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const param1 = params.param1 as string;
    
    // 实现工具逻辑
    const result = await doSomething(param1);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
```

### 3. 注册工具

在 `src/ai/tools/registry.ts` 中注册：

```typescript
import { myNewTool } from './schemas/myTools';
import { executeMyNewTool } from './executors/myTools';

private registerDefaultTools(): void {
  // 现有工具...
  this.register(myNewTool, executeMyNewTool);
}
```

## 技术优势

1. **类型安全**: 完整的TypeScript类型定义
2. **提供商无关**: 自动适配Gemini和OpenAI格式
3. **易于测试**: 工具可独立测试，无需AI集成
4. **可维护性**: 清晰的分层架构
5. **可扩展性**: 简单的工具添加流程
6. **复用性**: Chat和Agent共享相同的工具系统
7. **错误处理**: 统一的错误处理和结果格式

## 与现有系统集成

### 数据库集成

工具直接使用现有的数据库服务：

```typescript
import { getNotes, addNote, updateNote, deleteNote } from '@shared/services/db';
```

### 错误处理

使用项目现有的错误处理机制：

```typescript
import { handleError } from '@shared/services/errorHandler';
```

### 类型系统

复用现有类型：

```typescript
import { Note } from '@shared/types';
```

## 未来增强方向

1. **工具权限管理**: 控制不同场景下可用的工具
2. **工具中间件**: 添加日志记录、速率限制、验证
3. **工具组合**: 将多个工具组合成工作流
4. **工具元数据**: 跟踪使用统计、性能指标
5. **更多工具类别**: 
   - 文件操作工具
   - 日历工具
   - 网页搜索工具
   - 计算工具
   - 等等

6. **自动工具调用**: 在流式响应中自动执行工具并返回结果
7. **多轮工具调用**: 支持工具链式调用和复杂交互
8. **工具调用历史**: 记录和分析工具使用模式

## 文档

- 工具系统架构：`src/ai/tools/README.md`
- 使用指南：`src/ai/USAGE.md`
- 本文档：`TOOLS_IMPLEMENTATION.md`

## 测试

工具可以独立测试，无需启动完整应用：

```typescript
// test/tools.test.ts
import { executeTool } from '@shared/services/toolService';

describe('Note Tools', () => {
  test('createNote should create a note', async () => {
    const result = await executeTool({
      name: 'createNote',
      parameters: {
        title: 'Test Note',
        content: 'Test Content'
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });
});
```

## 总结

本实现提供了一个完整、可扩展的AI工具函数调用系统，具有以下特点：

✅ 完整的笔记管理工具（创建、读取、更新、删除、搜索、列表）
✅ 跨提供商支持（Gemini和OpenAI）
✅ 类型安全的TypeScript实现
✅ 清晰的架构和文档
✅ 为聊天和Agent提供统一接口
✅ 易于扩展新工具
✅ 与现有系统无缝集成

该系统已准备就绪，可立即在AI聊天中使用，同时为未来的智能体工作流预留了清晰的接口。
