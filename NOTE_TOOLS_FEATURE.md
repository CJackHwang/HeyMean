# 笔记工具函数调用功能说明

## 功能概述

本项目已成功实现完整的AI笔记工具函数调用功能，允许AI（Gemini和OpenAI）在聊天过程中自动调用工具来管理笔记。该系统采用模块化设计，为未来的智能体(Agent)工作流预留了清晰的复用接口。

## 核心特性

✅ **6个完整的笔记管理工具**
- createNote - 创建笔记
- getNote - 查看笔记
- listNotes - 列出笔记
- updateNote - 更新笔记
- searchNotes - 搜索笔记
- deleteNote - 删除笔记

✅ **跨AI提供商支持**
- Gemini (Google): 自动转换为FunctionDeclaration格式
- OpenAI: 自动转换为FunctionDefinition格式

✅ **自动工具调用**
- AI决定何时调用工具
- 自动执行工具并返回结果
- 支持多轮工具调用（最多4轮）
- 实时反馈工具执行状态

✅ **复用架构设计**
- 统一的工具注册系统
- 提供商无关的接口层
- Chat和未来Agent共享相同工具

✅ **类型安全**
- 完整的TypeScript类型定义
- 编译时类型检查
- 运行时参数验证

## 使用示例

### 在聊天中使用

用户只需自然地与AI对话，AI会自动调用工具：

```
用户: "帮我创建一个会议笔记，标题是'周例会'，内容是'讨论Q4目标'"

AI会自动:
1. 识别需要创建笔记
2. 调用 createNote 工具
3. 返回创建结果
4. 向用户确认创建成功

用户: "帮我搜索包含'会议'的笔记"

AI会自动:
1. 调用 searchNotes 工具
2. 查询包含"会议"的笔记
3. 将结果以友好的方式展示给用户
```

### 工具执行流程

```
1. 用户发送消息
   ↓
2. AI分析需求，决定是否调用工具
   ↓
3. AI生成工具调用请求（包含参数）
   ↓
4. 系统自动执行工具
   ↓
5. 工具返回结果
   ↓
6. 将结果反馈给用户（格式化显示）
   ↓
7. AI继续对话或进行下一步操作
```

### 工具结果展示

成功执行：
```
✅ **Tool Executed**: `createNote`
```json
{
  "id": 123,
  "title": "周例会",
  "content": "讨论Q4目标",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

失败执行：
```
❌ **Tool Execution Failed**: `getNote`
Error: Note with id 999 not found
```

## 技术架构

### 文件结构

```
src/
├── ai/                                  # AI能力层
│   ├── tools/                          # 工具系统
│   │   ├── types.ts                    # 类型定义
│   │   ├── registry.ts                 # 工具注册器
│   │   ├── schemas/
│   │   │   ├── noteTools.ts           # 笔记工具Schema
│   │   │   └── index.ts
│   │   ├── executors/
│   │   │   ├── noteTools.ts           # 笔记工具实现
│   │   │   └── index.ts
│   │   ├── README.md
│   │   └── index.ts
│   ├── USAGE.md                        # 使用指南
│   └── index.ts
├── shared/
│   └── services/
│       ├── toolService.ts              # 统一工具服务
│       ├── apiService.ts               # 已集成工具调用
│       └── db.ts                       # 数据库操作（工具使用）
```

### 关键组件

#### 1. 工具注册系统 (`ai/tools/registry.ts`)
```typescript
// 单例注册器，管理所有可用工具
export const toolRegistry = new ToolRegistry();

// 自动注册默认工具（笔记工具）
toolRegistry.register(createNoteTool, executeCreateNote);
toolRegistry.register(getNoteTool, executeGetNote);
// ... 其他工具
```

#### 2. 工具服务 (`shared/services/toolService.ts`)
```typescript
// 获取特定提供商格式的工具
export const getToolsForProvider = (
  provider: ApiProvider
): GeminiFunctionDeclaration[] | OpenAIFunctionDefinition[]

// 执行工具调用
export const executeTool = async (
  toolCall: ToolCall
): Promise<ToolResult>

// 格式化工具结果显示
export const formatToolResult = (
  toolName: string,
  result: ToolResult
): string
```

#### 3. API服务集成 (`shared/services/apiService.ts`)

**Gemini支持**:
- 使用`tools`配置传递工具定义
- 使用`FunctionCallingConfigMode.AUTO`让AI自主决定
- 通过`response.functionCalls`获取工具调用
- 使用`createPartFromFunctionResponse`返回结果

**OpenAI支持**:
- 使用`tools`数组传递工具定义
- 使用`tool_choice: 'auto'`让AI自主决定
- 通过`message.tool_calls`获取工具调用
- 添加`role: 'tool'`的消息返回结果

## 工具定义示例

### Schema定义 (`ai/tools/schemas/noteTools.ts`)

```typescript
export const createNoteTool: ToolDefinition = {
  name: 'createNote',
  description: 'Create a new note with title and content.',
  parameters: {
    title: {
      type: 'string',
      description: 'The title of the note',
      required: true,
    },
    content: {
      type: 'string',
      description: 'The content of the note',
      required: true,
    },
  },
  requiredParams: ['title', 'content'],
};
```

### 执行器实现 (`ai/tools/executors/noteTools.ts`)

```typescript
export const executeCreateNote: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    const title = params.title as string;
    const content = params.content as string;
    
    // 验证参数
    if (!title || !content) {
      return { success: false, error: 'Invalid parameters' };
    }
    
    // 调用数据库
    const newNote = await addNote(title, content);
    
    // 返回成功结果
    return {
      success: true,
      data: {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        // ... 其他字段
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
```

## 工具调用流程（Gemini示例）

```typescript
// 1. 获取工具定义
const tools = getToolsForProvider(ApiProvider.GEMINI);

// 2. 发送请求给AI
const response = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: conversation,
  config: {
    systemInstruction,
    tools: [{ functionDeclarations: tools }],
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.AUTO,
      },
    },
  },
});

// 3. 检查是否有工具调用
const functionCalls = response.functionCalls ?? [];

// 4. 执行每个工具调用
for (const functionCall of functionCalls) {
  const result = await executeTool({
    name: functionCall.name,
    parameters: functionCall.args || {}
  });
  
  // 5. 将结果添加到对话历史
  const responsePart = createPartFromFunctionResponse(
    functionCall.id,
    functionCall.name,
    {
      success: result.success,
      data: result.data,
      error: result.error
    }
  );
  
  conversation.push({
    role: 'function',
    parts: [responsePart]
  });
}

// 6. 继续对话（如果需要）
// AI会基于工具结果生成最终回复
```

## 扩展新工具

### 步骤1: 定义Schema

在`src/ai/tools/schemas/`创建工具定义：

```typescript
export const myNewTool: ToolDefinition = {
  name: 'myNewTool',
  description: 'Clear description of what the tool does',
  parameters: {
    param1: {
      type: 'string',
      description: 'Parameter description',
      required: true,
    },
    param2: {
      type: 'number',
      description: 'Another parameter',
      required: false,
    },
  },
  requiredParams: ['param1'],
};
```

### 步骤2: 实现执行器

在`src/ai/tools/executors/`创建执行器：

```typescript
export const executeMyNewTool: ToolExecutor = async (params): Promise<ToolResult> => {
  try {
    // 参数验证
    const param1 = params.param1 as string;
    if (!param1) {
      return { success: false, error: 'param1 is required' };
    }
    
    // 执行逻辑
    const result = await performAction(param1);
    
    // 返回结果
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

### 步骤3: 注册工具

在`src/ai/tools/registry.ts`中注册：

```typescript
private registerDefaultTools(): void {
  // 现有工具...
  this.register(myNewTool, executeMyNewTool);
}
```

## 为Agent预留的接口

未来Agent可以使用相同的工具系统：

```typescript
import { toolRegistry } from '@ai/tools/registry';
import { executeTool } from '@shared/services/toolService';

class SmartAgent {
  async planAndExecute(task: string) {
    // 1. 获取所有可用工具
    const tools = toolRegistry.getAllDefinitions();
    
    // 2. Agent分析任务并规划步骤
    const plan = await this.analyzePlan(task, tools);
    
    // 3. 依次执行工具
    for (const step of plan.steps) {
      const result = await executeTool({
        name: step.toolName,
        parameters: step.parameters
      });
      
      if (!result.success) {
        // 处理失败...
        await this.handleFailure(result.error);
      } else {
        // 继续下一步...
        await this.processResult(result.data);
      }
    }
  }
}
```

## 安全性和最佳实践

### 1. 参数验证
所有工具执行器都进行严格的参数验证：
```typescript
if (!param || typeof param !== 'expectedType') {
  return { success: false, error: 'Invalid parameter' };
}
```

### 2. 错误处理
统一的错误处理机制：
```typescript
try {
  // 工具逻辑
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

### 3. 防止无限循环
工具调用限制最大4轮迭代：
```typescript
const MAX_TOOL_ITERATIONS = 4;
for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
  // 工具调用逻辑
}
```

### 4. 取消支持
所有工具调用都支持AbortSignal：
```typescript
if (signal?.aborted) {
  throw new AppError('CANCELLED', 'Request was cancelled');
}
```

## 测试和调试

### 直接测试工具

```typescript
import { executeTool } from '@shared/services/toolService';

// 测试创建笔记
const result = await executeTool({
  name: 'createNote',
  parameters: {
    title: 'Test Note',
    content: 'Test Content'
  }
});

console.log('Result:', result);
// { success: true, data: { id: 123, ... } }
```

### 查看可用工具

```typescript
import { getAvailableToolNames } from '@shared/services/toolService';

const toolNames = getAvailableToolNames();
console.log('Available tools:', toolNames);
// ['createNote', 'getNote', 'listNotes', ...]
```

### 调试工具调用

工具执行结果会实时显示在聊天中：
- ✅ 绿色勾号 = 成功
- ❌ 红色叉号 = 失败
- JSON格式显示详细数据

## 性能考虑

1. **工具调用延迟**: 每次工具调用会产生额外的API请求延迟
2. **数据库操作**: 工具执行涉及IndexedDB操作
3. **多轮迭代**: 最多4轮迭代可能导致较长的响应时间
4. **结果展示**: 大型JSON结果会增加界面渲染负担

## 未来增强方向

1. **更多工具类别**
   - 文件管理工具
   - 日历工具
   - 网页搜索工具
   - 计算工具

2. **权限管理**
   - 工具访问控制
   - 用户授权确认
   - 敏感操作保护

3. **工具组合**
   - 工具链式调用
   - 工作流编排
   - 条件分支

4. **性能优化**
   - 工具调用缓存
   - 并行执行
   - 流式工具结果

5. **高级特性**
   - 工具使用统计
   - 智能推荐
   - 上下文感知

## 文档和资源

- 详细实现说明: `TOOLS_IMPLEMENTATION.md`
- 工具系统文档: `src/ai/tools/README.md`
- 使用指南: `src/ai/USAGE.md`
- API文档: 见源代码注释

## 总结

本实现提供了一个完整、可扩展、生产就绪的AI工具函数调用系统：

✅ 6个完整的笔记管理工具
✅ Gemini和OpenAI双提供商支持
✅ 自动工具调用和结果反馈
✅ 类型安全的TypeScript实现
✅ 为Chat和Agent提供统一接口
✅ 易于扩展新工具
✅ 完善的错误处理和安全机制

系统已完全集成到现有的聊天功能中，AI可以自然地在对话中调用工具来管理笔记，为未来的智能体工作流也预留了清晰、易用的接口。
