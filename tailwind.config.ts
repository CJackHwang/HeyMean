// Tailwind v4 不再使用 JS 配置中的 content/theme 扩展。
// 将定制放入 CSS 中的 @theme/@utility/@custom-variant 等。
export default {
  // 仍然保持暗色模式选择器行为
  darkMode: 'class',
} satisfies Record<string, unknown>;
