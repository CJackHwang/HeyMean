# Tailwind CSS 4 文档

## 1. 安装指南

### 1.1 使用 Vite 安装
1. 创建 Vite 项目
```bash
npm create vite@latest my-project
cd my-project
```

2. 安装 Tailwind CSS 及 Vite 插件
```bash
npm install tailwindcss @tailwindcss/vite
```

3. 配置 Vite
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

4. 导入 Tailwind CSS
在 CSS 文件中添加:
```css
@import "tailwindcss";
```

5. 启动开发服务器
```bash
npm run dev
```

### 1.2 使用 Tailwind CLI 安装
1. 安装 Tailwind CSS
```bash
npm install -D tailwindcss
npx tailwindcss init
```

2. 配置模板路径
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

3. 添加 Tailwind 指令到 CSS
```css
/* src/input.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

4. 启动构建过程
```bash
npx tailwindcss -i ./src/input.css -o ./src/output.css --watch
```

## 2. 核心概念

### 2.1 使用实用工具类进行样式设计

Tailwind CSS 通过组合多个单一用途的展示类（实用工具类）来设计界面：

```html
<div class="mx-auto flex max-w-sm items-center gap-x-4 rounded-xl bg-white p-6 shadow-lg outline outline-black/5 dark:bg-slate-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
  <img class="size-12 shrink-0" src="/img/logo.svg" alt="ChitChat Logo" />
  <div>
    <div class="text-xl font-medium text-black dark:text-white">ChitChat</div>
    <p class="text-gray-500 dark:text-gray-400">You have a new message!</p>
  </div>
</div>
```

#### 为什么不直接使用内联样式？

使用实用工具类相比内联样式有多个优势：
- **设计约束**：实用工具类基于预定义的设计系统，确保视觉一致性
- **状态样式**：支持 hover、focus 等状态变体
- **响应式设计**：通过响应式变体轻松实现响应式界面

#### 状态样式

使用前缀可以为元素添加状态样式：
```html
<button class="bg-sky-500 hover:bg-sky-700 ...">Save changes</button>
```

生成的 CSS：
```css
.hover\:bg-sky-700 {
  &:hover {
    background-color: var(--color-sky-700);
  }
}
```

#### 媒体查询和断点

使用断点前缀实现响应式设计：
```html
<div class="grid grid-cols-2 sm:grid-cols-3">
  <!-- ... -->
</div>
```

默认断点：
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

#### 暗色模式

使用 `dark:` 前缀为暗色模式添加样式：
```html
<div class="bg-white dark:bg-gray-800 rounded-lg px-6 py-8 ring shadow-xl ring-gray-900/5">
  <!-- ... -->
</div>
```

### 2.2 主题变量

主题变量是使用 `@theme` 指令定义的特殊 CSS 变量，用于影响项目中可用的实用工具类。

#### 定义主题变量

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.62 0.15 274);
  --spacing-xs: 0.25rem;
  --breakpoint-3xl: 1920px;
}
```

#### 主题变量命名空间

主题变量按命名空间组织，每个命名空间对应一类实用工具：

| 命名空间 | 实用工具类 |
|---------|----------|
| `--color-*` | 颜色工具类如 `bg-red-500`、`text-sky-300` |
| `--font-*` | 字体工具类如 `font-sans` |
| `--text-*` | 字体大小工具类如 `text-xl` |
| `--font-weight-*` | 字重工具类如 `font-bold` |
| `--tracking-*` | 字母间距工具类如 `tracking-wide` |
| `--leading-*` | 行高工具类如 `leading-tight` |
| `--breakpoint-*` | 响应式断点变体如 `sm:*` |
| `--container-*` | 容器查询变体如 `@sm:*` |
| `--spacing-*` | 间距工具类如 `px-4` |
| `--radius-*` | 边框半径工具类如 `rounded-sm` |
| `--shadow-*` | 阴影工具类如 `shadow-md` |

#### 自定义主题

**扩展默认主题**：
```css
@import "tailwindcss";

@theme {
  --font-script: Great Vibes, cursive;
}
```

**覆盖默认主题**：
```css
@import "tailwindcss";

@theme {
  --breakpoint-sm: 30rem; /* 覆盖默认的 40rem */
}
```

**完全自定义主题**：
```css
@import "tailwindcss";

@theme {
  --*: initial; /* 清除默认主题 */
  --spacing: 4px;
  --font-body: Inter, sans-serif;
  --color-lagoon: oklch(0.72 0.11 221.19);
  --color-coral: oklch(0.74 0.17 40.24);
}
```

## 3. 添加自定义样式

### 3.1 使用任意值

当需要使用主题之外的特殊值时，可以使用方括号语法：

```html
<div class="top-[117px] bg-[#bada55] text-[22px]">
  <!-- ... -->
</div>
```

结合响应式变体：
```html
<div class="top-[117px] lg:top-[344px]">
  <!-- ... -->
</div>
```

### 3.2 任意属性

使用方括号语法添加任意 CSS 属性：

```html
<div class="[mask-type-luminance] hover:[mask-type-alpha]">
  <!-- ... -->
</div>
```

### 3.3 自定义工具类

使用 `@utility` 指令创建自定义工具类：

```css
@utility content-auto {
  content-visibility: auto;
}
```

使用自定义工具类：
```html
<div class="content-auto hover:content-auto">
  <!-- ... -->
</div>
```

### 3.4 组件类

在 `components` 层中定义组件类：

```css
@layer components {
  .card {
    @apply bg-white rounded-lg shadow-md;
    &:hover {
      @apply shadow-xl transform -translate-y-1;
    }
  }
}
```

使用组件类：
```html
<div class="card rounded-none"> <!-- 可以使用工具类覆盖组件类样式 -->
  <!-- ... -->
</div>

## 4. 常用工具类参考

### 4.1 布局工具类

- `flex`: 将元素设置为 flex 布局
- `flex-row`: 水平排列 flex 子项
- `flex-col`: 垂直排列 flex 子项
- `justify-center`: 水平居中对齐 flex 子项
- `items-center`: 垂直居中对齐 flex 子项
- `grid`: 将元素设置为 grid 布局
- `grid-cols-3`: 创建 3 列网格

### 4.2 文本工具类

- `text-xl`: 设置字体大小为 xl
- `text-blue-500`: 设置文本颜色为蓝色
- `font-bold`: 设置字体粗细为粗体
- `italic`: 设置字体为斜体
- `tracking-wide`: 设置字母间距为宽

### 4.3 背景与边框工具类

- `bg-gray-100`: 设置背景颜色为浅灰色
- `border-2`: 设置边框宽度为 2px
- `border-red-400`: 设置边框颜色为红色
- `rounded-lg`: 设置边框圆角为 lg
- `shadow-md`: 添加中等阴影

### 4.4 响应式工具类

- `sm:`: 小屏幕（≥640px）
- `md:`: 中等屏幕（≥768px）
- `lg:`: 大屏幕（≥1024px）
- `xl:`: 特大屏幕（≥1280px）

示例：
```html
<div class="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5">
  响应式宽度示例
</div>
```

### 4.5 交互工具类

- `hover:bg-blue-600`: 悬停状态时背景色变为蓝色
- `focus:outline-none`: 聚焦状态时移除轮廓
- `active:bg-blue-700`: 激活状态时背景色变为深蓝色

示例：
```html
<button class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400">
  交互按钮示例
</button>
```
## 5. API参考与高级功能

### 5.1 核心指令与函数

#### 5.1.1 关键指令
- `@import "tailwindcss"`: 导入Tailwind CSS核心功能（替代v3中的`@tailwind`指令）
- `@theme`: 定义主题变量，如颜色、字体、断点等
- `@utility`: 创建自定义工具类，支持变体（hover、focus等）
- `@custom-variant`: 定义自定义变体，如深色模式、自定义状态

```css
/* 示例：定义自定义变体 */
@custom-variant dark (&:is(.dark *));

/* 示例：创建自定义工具类 */
@utility content-auto {
  content-visibility: auto;
}
```

#### 5.1.2 内置函数
- `--value()`: 解析动态值，支持主题变量、原始值和任意值
- `--modifier()`: 处理变体修饰符
- `theme()`: 引用主题配置值

```css
/* 示例：使用--value()函数 */
@utility tab-* {
  tab-size: --value(integer);
}
```

### 5.2 插件开发指南

#### 5.2.1 插件基础结构
```javascript
const plugin = require('tailwindcss/plugin')

module.exports = plugin(function({ addUtilities, addComponents, theme }) {
  // 添加工具类
  addUtilities({
    '.content-auto': {
      'content-visibility': 'auto',
    }
  })
  
  // 添加组件
  addComponents({
    '.btn-primary': {
      backgroundColor: theme('colors.blue.600'),
      color: 'white',
      padding: theme('spacing.4'),
      borderRadius: theme('borderRadius.lg'),
    }
  })
})
```

#### 5.2.2 动态工具类生成
```javascript
// 生成响应式网格工具类
plugin(function({ addUtilities, theme }) {
  const minWidths = theme('gridAutoFit.minWidth', {
    'xs': '12rem',
    'sm': '14rem',
    'md': '16rem'
  })
  
  const utilities = Object.entries(minWidths).map(([key, value]) => ({
    [`.grid-auto-fit-${key}`]: {
      'grid-template-columns': `repeat(auto-fit, minmax(${value}, 1fr))`
    }
  }))
  
  addUtilities(utilities, ['responsive'])
})
```

### 5.3 迁移指南（从v3到v4）

#### 5.3.1 核心变更
1. **配置文件迁移**：从`tailwind.config.js`迁移到CSS中的`@theme`指令
   ```css
   /* v4配置方式 */
   @import "tailwindcss";
   
   @theme {
     --color-primary: oklch(0.62 0.15 274);
     --spacing-xs: 0.25rem;
     --breakpoint-3xl: 1920px;
   }
   ```

2. **依赖精简**：移除`autoprefixer`和`postcss-import`，内置支持嵌套和前缀
   ```javascript
   // postcss.config.js (v4)
   export default {
     plugins: {
       '@tailwindcss/postcss': {},
     },
   }
   ```

3. **工具类变更**：部分工具类重命名或移除
   | 旧类名 | 新类名 |
   |--------|--------|
   | `bg-opacity-*` | `bg-black/50` (透明度修饰符) |
   | `flex-shrink-*` | `shrink-*` |
   | `overflow-ellipsis` | `text-ellipsis` |

#### 5.3.2 升级工具
使用官方升级工具自动处理大部分迁移工作：
```bash
npx @tailwindcss/upgrade
```

## 6. 高级配置与最佳实践

### 6.1 性能优化

#### 6.1.1 构建性能
- **Vite集成**：使用`@tailwindcss/vite`插件，增量构建提速100倍
  ```typescript
  // vite.config.ts
  import { defineConfig } from 'vite'
  import tailwindcss from '@tailwindcss/vite'
  
  export default defineConfig({
    plugins: [tailwindcss()],
  })
  ```

- **内容检测**：自动扫描模板文件，无需手动配置`content`数组

#### 6.1.2 运行时优化
- 使用`content-visibility: auto`优化渲染性能
- 利用`@starting-style`实现零JS动画过渡
  ```css
  @starting-style {
    .fade-in {
      opacity: 0;
    }
  }
  
  .fade-in {
    transition: opacity 0.3s ease-out;
  }
  ```

### 6.2 主题系统深度定制

#### 6.2.1 OKLCH颜色模型
v4默认采用OKLCH颜色模型，支持更广色域和更精确的亮度控制：
```css
@theme {
  --color-primary: oklch(0.62 0.15 274); /* P3广色域颜色 */
  --color-secondary: oklch(0.75 0.22 320);
}
```

#### 6.2.2 动态主题切换
结合CSS变量和`@custom-variant`实现主题切换：
```css
@custom-variant dark (&:is(.dark *));

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

:root {
  --background: #ffffff;
  --foreground: #000000;
}

.dark {
  --background: #1a1a1a;
  --foreground: #ffffff;
}
```

### 6.3 容器查询与高级响应式

#### 6.3.1 容器查询
原生支持CSS容器查询，无需插件：
```html
<div class="@container">
  <div class="grid grid-cols-1 @md:grid-cols-2">
    <!-- 基于父容器宽度的响应式布局 -->
  </div>
</div>
```

#### 6.3.2 3D变换工具类
新增3D变换工具，如`rotate-x-*`、`perspective-*`：
```html
<div class="perspective-1000 rotate-x-45 backface-visible">
  3D变换元素
</div>
```

## 7. 官方发布日志与新特性

### 7.1 v4.0主要更新（2025年1月）
- **全新引擎**：Rust编写的Token提取器，全量构建提速3.5倍，增量构建提速100倍
- **CSS优先配置**：使用`@theme`指令替代JS配置文件
- **动态工具类**：支持任意值和动态变体，如`grid-cols-[1fr_500px_2fr]`
- **P3广色域**：默认采用OKLCH颜色模型，支持更丰富的色彩
- **容器查询**：原生支持容器查询，无需插件
- **3D变换**：新增`rotate-x-*`、`translate-z-*`等3D变换工具类

### 7.2 v4.1更新（2025年3月）
- **性能优化**：Lightning CSS深度整合，构建速度再提升20%
- **渐变API扩展**：支持径向渐变、锥形渐变和插值模式
- **@starting-style支持**：实现CSS原生过渡动画
- **not-*变体**：支持否定条件样式，如`not-hover:opacity-100`

## 8. 常见问题与解决方案

### 8.1 配置迁移问题
**问题**：v3配置文件无法直接使用  
**解决方案**：使用升级工具转换或手动迁移至`@theme`指令
```bash
npx @tailwindcss/upgrade
```

### 8.2 插件兼容性
**问题**：部分v3插件不兼容v4  
**解决方案**：检查插件更新或修改插件代码，使用新的`@utility`和`@custom-variant`语法

### 8.3 浏览器支持
**问题**：旧浏览器不支持新CSS特性  
**解决方案**：对于需要支持旧浏览器的项目，可暂时保留v3，或使用polyfill

## 9. 扩展资源

- **官方文档**：https://tailwindcss.com/docs/
- **GitHub仓库**：https://github.com/tailwindlabs/tailwindcss
- **社区插件**：https://tailwindcss.com/plugins
- **学习资源**：https://tailwindcss.com/learn