import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import CodeBlock from './CodeBlock';
import { useSettings } from '../hooks/useSettings';

const mergeClassNames = (existing: string | undefined, extra: string) => {
  return [existing, extra].filter(Boolean).join(' ');
};

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
        key={theme}
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={katexPlugin || []}
        components={{
          // --- Custom Heading Components ---
          h1: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLHeadingElement>;
            return (
              <h1
                className={mergeClassNames(
                  className,
                  'text-3xl font-bold mt-6 mb-4 text-primary-text-light dark:text-primary-text-dark border-b border-neutral-200 dark:border-neutral-700 pb-2'
                )}
                {...rest}
              />
            );
          },
          h2: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLHeadingElement>;
            return (
              <h2
                className={mergeClassNames(
                  className,
                  'text-2xl font-bold mt-5 mb-3 text-primary-text-light dark:text-primary-text-dark border-b border-neutral-200 dark:border-neutral-700 pb-2'
                )}
                {...rest}
              />
            );
          },
          h3: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLHeadingElement>;
            return (
              <h3
                className={mergeClassNames(
                  className,
                  'text-xl font-semibold mt-4 mb-2 text-primary-text-light dark:text-primary-text-dark'
                )}
                {...rest}
              />
            );
          },
          h4: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLHeadingElement>;
            return (
              <h4
                className={mergeClassNames(
                  className,
                  'text-lg font-semibold mt-3 mb-2 text-primary-text-light dark:text-primary-text-dark'
                )}
                {...rest}
              />
            );
          },
          h5: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLHeadingElement>;
            return (
              <h5
                className={mergeClassNames(
                  className,
                  'text-base font-semibold mt-2 mb-1 text-primary-text-light dark:text-primary-text-dark'
                )}
                {...rest}
              />
            );
          },
          h6: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLHeadingElement>;
            return (
              <h6
                className={mergeClassNames(
                  className,
                  'text-sm font-semibold mt-2 mb-1 text-neutral-600 dark:text-neutral-400'
                )}
                {...rest}
              />
            );
          },

          // --- Custom List Components ---
          ul: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLUListElement>;
            const hasTaskList = className?.includes('contains-task-list');
            const listClasses = hasTaskList
              ? 'list-none pl-0 ml-0 my-3 space-y-2'
              : 'list-disc list-outside ml-5 my-3 space-y-1';
            return <ul className={mergeClassNames(className, listClasses)} {...rest} />;
          },
          ol: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.OlHTMLAttributes<HTMLOListElement>;
            return (
              <ol
                className={mergeClassNames(className, 'list-decimal list-outside ml-5 my-3 space-y-1')}
                {...rest}
              />
            );
          },
          li: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.LiHTMLAttributes<HTMLLIElement>;
            const isTaskItem = className?.includes('task-list-item');
            const itemClasses = isTaskItem
              ? 'text-neutral-700 dark:text-neutral-300 flex items-start gap-2'
              : 'text-neutral-700 dark:text-neutral-300';
            return <li className={mergeClassNames(className, itemClasses)} {...rest} />;
          },

          // --- Custom Blockquote Component ---
          blockquote: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.BlockquoteHTMLAttributes<HTMLQuoteElement>;
            return (
              <blockquote
                className={mergeClassNames(
                  className,
                  'border-l-4 border-neutral-300 dark:border-neutral-600 pl-4 my-3 italic text-neutral-600 dark:text-neutral-400'
                )}
                {...rest}
              />
            );
          },

          // --- Custom Paragraph Component ---
          p: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLParagraphElement>;
            return (
              <p
                className={mergeClassNames(
                  className,
                  'my-2 text-neutral-700 dark:text-neutral-300 leading-relaxed'
                )}
                {...rest}
              />
            );
          },

          // --- Custom Horizontal Rule ---
          hr: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLHRElement>;
            return (
              <hr
                className={mergeClassNames(className, 'my-4 border-t border-neutral-200 dark:border-neutral-700')}
                {...rest}
              />
            );
          },

          // --- Custom Strong/Em Components ---
          strong: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLElement>;
            return (
              <strong
                className={mergeClassNames(className, 'font-bold text-primary-text-light dark:text-primary-text-dark')}
                {...rest}
              />
            );
          },
          em: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLElement>;
            return (
              <em
                className={mergeClassNames(className, 'italic text-neutral-700 dark:text-neutral-300')}
                {...rest}
              />
            );
          },
          del: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLElement>;
            return (
              <del
                className={mergeClassNames(className, 'line-through text-neutral-500 dark:text-neutral-400')}
                {...rest}
              />
            );
          },

          // --- Custom Link Component ---
          a: ({ node: _node, ...props }) => {
            const { className, target, rel, ...rest } = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
            return (
              <a
                className={mergeClassNames(className, 'text-blue-600 dark:text-blue-400 hover:underline')}
                target={target ?? '_blank'}
                rel={rel ?? 'noopener noreferrer'}
                {...rest}
              />
            );
          },

          // --- Custom Table Component ---
          table: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.TableHTMLAttributes<HTMLTableElement>;
            const mergedClassName = mergeClassNames(className, 'min-w-full w-full text-sm');
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
                      const text = rows
                        .map((tr) =>
                          Array.from(tr.querySelectorAll('th,td'))
                            .map((td) => (td as HTMLElement).innerText)
                            .join('\t')
                        )
                        .join('\n');
                      navigator.clipboard.writeText(text);
                    }}
                  >Copy table</button>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className={mergedClassName} {...rest} />
                </div>
              </div>
            );
          },
          thead: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLTableSectionElement>;
            return <thead className={mergeClassNames(className, 'bg-neutral-50 dark:bg-white/5')} {...rest} />;
          },
          th: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.ThHTMLAttributes<HTMLTableHeaderCellElement>;
            return (
              <th
                className={mergeClassNames(
                  className,
                  'p-3 font-semibold text-left border-b border-neutral-200 dark:border-neutral-700 text-primary-text-light dark:text-primary-text-dark whitespace-nowrap'
                )}
                {...rest}
              />
            );
          },
          tr: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.HTMLAttributes<HTMLTableRowElement>;
            return (
              <tr
                className={mergeClassNames(
                  className,
                  'even:bg-black/2 dark:even:bg-white/2 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0'
                )}
                {...rest}
              />
            );
          },
          td: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.TdHTMLAttributes<HTMLTableDataCellElement>;
            return (
              <td
                className={mergeClassNames(className, 'p-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap')}
                {...rest}
              />
            );
          },

          // --- Custom Image Component ---
          img: ({ node: _node, ...props }) => {
            const { className, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement>;
            return <img className={mergeClassNames(className, 'max-w-full rounded-lg')} {...rest} />;
          },

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
            const mergedClassName = [className, 'wrap-break-word bg-neutral-50 dark:bg-white/5 p-3']
              .filter(Boolean)
              .join(' ');
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
            const { inline, className, children, ...rest } = compProps as {
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
            } & Record<string, unknown>;
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <CodeBlock language={match[1]} code={String(children)} />
            ) : (
              <code className={[className, 'wrap-break-word px-1 py-0.5 rounded bg-neutral-100 dark:bg-white/10'].filter(Boolean).join(' ')} {...rest}>
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
