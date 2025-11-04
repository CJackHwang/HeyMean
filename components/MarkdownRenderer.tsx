
import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import CodeBlock from './CodeBlock';
import { useSettings } from '../hooks/useSettings';
import { Theme } from '../types';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { theme } = useSettings();
  const [katexPlugin, setKatexPlugin] = useState<PluggableList | null>(null);

  const containsMath = useMemo(() => {
    // naive check: inline $...$, block $$...$$ or \( \) / \[ \]
    return /\$(?=\S)[\s\S]*?\$|\$\$[\s\S]*?\$\$|\\\(|\\\)|\\\[|\\\]/.test(content);
  }, [content]);

  useEffect(() => {
    let active = true;
    if (!containsMath) {
      setKatexPlugin(null);
      return;
    }
    (async () => {
      // Dynamically import KaTeX CSS and rehype-katex only when math is detected
      await import('katex/dist/katex.min.css');
      const mod = await import('rehype-katex');
      if (active) setKatexPlugin([mod.default] as PluggableList);
    })();
    return () => { active = false; };
  }, [containsMath]);

  return (
    // The .prose class now only affects standard text elements, not our custom components.
    <div className="prose prose-sm dark:prose-invert max-w-full wrap-break-word overflow-visible">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={katexPlugin || []}
        components={{
          // --- Custom Table Component ---
          // This completely overrides the default table rendering.
          // It's wrapped in a div that handles scrolling and styling.
          table: ({ node, ...props }) => {
            // 包裹表格并提供复制整表按钮
            return (
              <div className="my-4 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-end px-3 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-white/5">
                  <button
                    className="px-2 py-1 rounded-sm bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-xs"
                    aria-label="Copy table"
                    onClick={(e) => {
                      const container = (e.currentTarget.parentElement?.parentElement) as HTMLElement | null;
                      const tbl = container?.querySelector('table');
                      if (!tbl) return;
                      const rows = Array.from(tbl.querySelectorAll('tr'));
                      const text = rows.map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => (td as HTMLElement).innerText).join('\t')).join('\n');
                      navigator.clipboard.writeText(text);
                    }}
                  >Copy table</button>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="min-w-full w-full text-sm" {...props} />
                </div>
              </div>
            );
          },
          thead: ({ node, ...props }) => <thead className="bg-neutral-50 dark:bg-white/5" {...props} />,
          th: ({ node, ...props }) => (
            <th
              className="p-3 font-semibold text-left border-b border-neutral-200 dark:border-neutral-700 text-primary-text-light dark:text-primary-text-dark whitespace-nowrap"
              {...props}
            />
          ),
          tr: ({ node, ...props }) => (
            <tr
              className="even:bg-black/2 dark:even:bg-white/2 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="p-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
              {...props}
            />
          ),

          // --- Custom Image Component ---
          img: ({ node, ...props }) => (
            <img className="max-w-full rounded-lg" {...props} />
          ),
          
          pre: ({ node, children, ...props }) => {
            const firstChild = (node as any)?.children?.[0];
            const classNames: string[] = Array.isArray(firstChild?.properties?.className)
              ? (firstChild.properties.className as string[])
              : [];
            const hasLanguage = classNames.some((cls) => typeof cls === 'string' && cls.startsWith('language-'));
            if (hasLanguage) {
              return <>{children}</>;
            }
            const { className, ...rest } = props as { className?: string } & Record<string, unknown>;
            const mergedClassName = [className, 'wrap-break-word bg-neutral-50 dark:bg-white/5 p-3'].filter(Boolean).join(' ');
            return (
              <div className="my-4 overflow-x-auto custom-scrollbar rounded-lg border border-neutral-200 dark:border-neutral-700">
                <pre className={mergedClassName} {...rest}>
                  {children}
                </pre>
              </div>
            );
          },
          
          // --- Custom Code Block Component ---
          code(compProps) {
            const { inline, className, children, ...rest } = compProps as { inline?: boolean; className?: string; children?: React.ReactNode } & Record<string, unknown>;
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <CodeBlock language={match[1]} code={String(children)} />
            ) : (
              <code className={[className, 'wrap-break-word'].filter(Boolean).join(' ')} {...rest}>
                {children}
              </code>
            );
          },
        }}
      />
    </div>
  );
};

export default MarkdownRenderer;
