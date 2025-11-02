# Tailwind CSS v3 迁移到 v4 官方分步指南

## 概述
Tailwind CSS v4.0 是框架的重大更新版本，虽然已尽力减少破坏性变更，但仍需进行一些必要的更新。本指南概述了从 v3 升级到 v4 所需的所有步骤。

## 浏览器要求
Tailwind CSS v4.0 设计用于 Safari 16.4+、Chrome 111+ 和 Firefox 128+。如果需要支持旧浏览器，请继续使用 v3.4，直到浏览器支持要求发生变化。

## 使用升级工具
如果要将项目从 v3 升级到 v4，可以使用升级工具自动完成大部分工作：

```terminal
npx @tailwindcss/upgrade
```

升级工具需要 Node.js 20 或更高版本，建议在新分支中运行升级工具，然后仔细查看差异并在浏览器中测试项目，确保所有更改看起来正确。

## 手动升级

### 使用 PostCSS
在 v3 中，tailwindcss 包是一个 PostCSS 插件，但在 v4 中，PostCSS 插件位于专用的 @tailwindcss/postcss 包中。此外，v4 中自动处理导入和 vendor 前缀，因此可以删除项目中的 postcss-import 和 autoprefixer：

```js
// postcss.config.mjs
export default {
  plugins: {
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
    "@tailwindcss/postcss": {},
  },
};
```

### 使用 Vite
如果使用 Vite，建议从 PostCSS 插件迁移到新的专用 Vite 插件，以提高性能和获得最佳开发体验：

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
});
```

### 使用 Tailwind CLI
在 v4 中，Tailwind CLI 位于专用的 @tailwindcss/cli 包中。更新任何构建命令以使用新包：

```terminal
# 旧命令
npx tailwindcss -i input.css -o output.css

# 新命令
npx @tailwindcss/cli -i input.css -o output.css
```

## v3 到 v4 的主要变更

### 移除 @tailwind 指令
在 v4 中，使用常规 CSS @import 语句导入 Tailwind，而不是 v3 中使用的 @tailwind 指令：

```css
/* 旧方式 */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 新方式 */
@import "tailwindcss";
```

### 移除已弃用的工具类
已移除 v3 中已弃用且多年未记录的工具类，以下是已移除的工具类及其现代替代方案：

| 已弃用工具类 | 替代方案 |
|------------|---------|
| bg-opacity-* | 使用不透明度修饰符，如 bg-black/50 |
| text-opacity-* | 使用不透明度修饰符，如 text-black/50 |
| border-opacity-* | 使用不透明度修饰符，如 border-black/50 |
| divide-opacity-* | 使用不透明度修饰符，如 divide-black/50 |
| ring-opacity-* | 使用不透明度修饰符，如 ring-black/50 |
| placeholder-opacity-* | 使用不透明度修饰符，如 placeholder-black/50 |
| flex-shrink-* | shrink-* |
| flex-grow-* | grow-* |
| overflow-ellipsis | text-ellipsis |
| decoration-slice | box-decoration-slice |
| decoration-clone | box-decoration-clone |

### 重命名的工具类

| v3 工具类 | v4 工具类 |
|----------|----------|
| shadow-sm | shadow-xs |
| shadow | shadow-sm |
| drop-shadow-sm | drop-shadow-xs |
| drop-shadow | drop-shadow-sm |
| blur-sm | blur-xs |
| blur | blur-sm |
| backdrop-blur-sm | backdrop-blur-xs |
| backdrop-blur | backdrop-blur-sm |
| rounded-sm | rounded-xs |
| rounded | rounded-sm |
| outline-none | outline-hidden |
| ring | ring-3 |

### 更新的阴影、半径和模糊比例
已重命名默认阴影、半径和模糊比例，以确保每个工具类都有一个命名值。"bare" 版本仍可向后兼容，但除非更新为相应的 <utility>-xs 版本，否则 <utility>-sm 工具类的外观会有所不同。

```html
<!-- 旧方式 -->
<input class="shadow-sm" />

<!-- 新方式 -->
<input class="shadow-xs" />

<!-- 旧方式 -->
<input class="shadow" />

<!-- 新方式 -->
<input class="shadow-sm" />
```

### 重命名轮廓工具类
轮廓工具类现在默认设置 outline-width: 1px，以与边框和环工具类保持一致。此外，所有 outline-<number> 工具类默认 outline-style 为 solid，无需与 outline 组合使用：

```html
<!-- 旧方式 -->
<input class="outline outline-2" />

<!-- 新方式 -->
<input class="outline-2" />
```

outline-none 工具类已重命名为 outline-hidden：

```html
<!-- 旧方式 -->
<input class="focus:outline-none" />

<!-- 新方式 -->
<input class="focus:outline-hidden" />
```

### 默认环宽度更改
在 v3 中，ring 工具类添加了 3px 的环。在 v4 中，这已更改为 1px，以与边框和轮廓保持一致：

```html
<!-- 旧方式 -->
<input class="ring ring-blue-500" />

<!-- 新方式 -->
<input class="ring-3 ring-blue-500" />
```

### 间距选择器变更
space-x-* 和 space-y-* 工具类使用的选择器已更改，以解决大型页面上的严重性能问题：

```css
/* 旧方式 */
.space-y-4 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 1rem;
}

/* 新方式 */
.space-y-4 > :not(:last-child) {
  margin-bottom: 1rem;
}
```

如果此更改导致项目中出现问题，建议迁移到 flex 或 grid 布局并使用 gap：

```html
<!-- 旧方式 -->
<div class="space-y-4 p-4">
  <!-- 内容 -->
</div>

<!-- 新方式 -->
<div class="flex flex-col gap-4 p-4">
  <!-- 内容 -->
</div>
```

### 渐变变体使用
在 v3 中，使用变体覆盖渐变的一部分会"重置"整个渐变，而在 v4 中，这些值会被保留：

```html
<!-- v3 行为 -->
<div class="bg-gradient-to-r from-red-500 to-yellow-400 dark:from-blue-500">
  <!-- 暗模式下 to-* 颜色会变为透明 -->
</div>

<!-- v4 行为 -->
<div class="bg-linear-to-r from-red-500 via-orange-400 to-yellow-400 dark:via-none dark:from-blue-500 dark:to-teal-400">
  <!-- 需显式使用 via-none 重置渐变 -->
</div>
```

### 容器配置
在 v3 中，容器工具类有 center 和 padding 等配置选项，在 v4 中已不存在。要自定义 v4 中的容器工具类，使用 @utility 指令扩展它：

```css
@utility container {
  margin-inline: auto;
  padding-inline: 2rem;
}
```

### 默认边框颜色
在 v3 中，border-* 和 divide-* 工具类默认使用配置的 gray-200 颜色。在 v4 中，这已更改为 currentcolor：

```html
<!-- 旧方式 -->
<div class="border px-2 py-3 ...">
  <!-- 内容 -->
</div>

<!-- 新方式 -->
<div class="border border-gray-200 px-2 py-3 ...">
  <!-- 内容 -->
</div>
```

或者，添加以下基础样式以保留 v3 行为：

```css
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-gray-200, currentcolor);
  }
}
```

## 其他重要变更

### 预飞行样式变更
- **占位符文本颜色**：v3 中默认使用配置的 gray-400 颜色，v4 中使用当前文本颜色的 50% 不透明度
- **按钮光标**：按钮现在使用 cursor: default 而不是 cursor: pointer
- **对话框边距**：预飞行现在重置 <dialog> 元素的边距
- **隐藏属性优先级**：display 类不再优先于元素上的 hidden 属性

### 前缀使用
前缀现在看起来像变体，并且始终位于类名的开头：

```html
<div class="tw:flex tw:bg-red-500 tw:hover:bg-red-600">
  <!-- 内容 -->
</div>
```

### 自定义工具类
在 v4 中，使用 @utility 指令定义自定义工具类：

```css
/* 旧方式 */
@layer utilities {
  .tab-4 {
    tab-size: 4;
  }
}

/* 新方式 */
@utility tab-4 {
  tab-size: 4;
}
```

### 变体堆叠顺序
在 v3 中，堆叠变体从右到左应用，在 v4 中已更新为从左到右应用：

```html
<!-- 旧方式 -->
<ul class="py-4 first:*:pt-0 last:*:pb-0">
  <li>one</li>
  <li>two</li>
  <li>three</li>
</ul>

<!-- 新方式 -->
<ul class="py-4 *:first:pt-0 *:last:pb-0">
  <li>one</li>
  <li>two</li>
  <li>three</li>
</ul>
```

### 任意值中的变量
在 v4 中，使用 CSS 变量作为任意值的语法已更改为使用括号而不是方括号：

```html
<!-- 旧方式 -->
<div class="bg-[--brand-color]"></div>

<!-- 新方式 -->
<div class="bg(--brand-color)"></div>
```

### 移动设备上的悬停样式
在 v4 中，悬停变体仅在主要输入设备支持悬停时应用：

```css
@media (hover: hover) {
  .hover\:underline:hover {
    text-decoration: underline;
  }
}
```

如果需要旧行为，可以使用自定义变体覆盖：

```css
@custom-variant hover(&:hover);
```

## 总结
本指南涵盖了从 Tailwind CSS v3 迁移到 v4 的主要步骤和注意事项。建议优先使用官方升级工具自动化迁移过程，并在升级后彻底测试项目，确保所有功能和样式正常工作。对于复杂项目，可能需要手动调整一些迁移工具未捕获的内容。