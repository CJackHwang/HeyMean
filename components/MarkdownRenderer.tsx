import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSettings } from '../hooks/useSettings';
import { Theme } from '../types';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { theme } = useSettings();
  const syntaxTheme = theme === Theme.DARK ? oneDark : oneLight;

  return (
    // The .prose class now only affects standard text elements, not our custom components.
    <div className="prose prose-sm dark:prose-invert max-w-full break-words">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // --- Custom Table Component ---
          // This completely overrides the default table rendering.
          // It's wrapped in a div that handles scrolling and styling,
          // bypassing any .prose conflicts.
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto custom-scrollbar my-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-50 dark:bg-white/5" {...props} />,
          th: ({ node, ...props }) => (
            <th
              className="p-3 font-semibold text-left border-b border-gray-200 dark:border-gray-700"
              {...props}
            />
          ),
          tr: ({ node, ...props }) => (
            <tr
              className="dark:odd:bg-white/[0.02] last:border-b-0"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="p-3 border-b border-gray-200 dark:border-gray-700"
              {...props}
            />
          ),

          // --- Custom Image Component ---
          img: ({ node, ...props }) => (
            <img className="max-w-full rounded-lg" {...props} />
          ),
          
          // --- Custom Code Block Component ---
          // This component provides a robust, scrollable container for code blocks,
          // preventing them from breaking the layout.
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              // This container handles the scrolling and rounded corners.
              <div className="my-4 rounded-lg overflow-x-auto custom-scrollbar">
                <SyntaxHighlighter
                  children={String(children).replace(/\n$/, '')}
                  style={syntaxTheme}
                  language={match[1]}
                  PreTag="div" // Use a div to avoid prose styles
                  // The highlighter provides its own background and padding.
                  // We remove its default margin to fit our container.
                  customStyle={{
                    margin: 0,
                    borderRadius: 0, 
                  }}
                  {...props}
                />
              </div>
            ) : (
              // For inline code, use the default styling from `.prose`.
              <code className={className} {...props}>
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