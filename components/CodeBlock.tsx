import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Theme } from '../types';
// We will lazy-load PrismLight and languages on demand

interface CodeBlockProps {
  language: string | undefined;
  code: string;
}

const MAX_COLLAPSED_LINES = 30;

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const { theme } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [styleTheme, setStyleTheme] = useState<any>(null);
  const [Highlighter, setHighlighter] = useState<React.ComponentType<any> | null>(null);
  const [registerLanguage, setRegisterLanguage] = useState<((name: string, syntax: any) => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const styles = await import('react-syntax-highlighter/dist/esm/styles/prism');
      const selected = theme === Theme.DARK ? styles.oneDark : styles.oneLight;
      if (mounted) setStyleTheme(selected);
      // Import PrismLight directly from ESM entry to avoid pulling highlight.js
      const prismMod = await import('react-syntax-highlighter/dist/esm/prism-light');
      const PrismLightComp = (prismMod as any).default || (prismMod as any).PrismLight;
      if (mounted && PrismLightComp) {
        setHighlighter(() => PrismLightComp as React.ComponentType<any>);
        setRegisterLanguage(() => (PrismLightComp as any).registerLanguage);
      }
    })();
    return () => { mounted = false; };
  }, [theme]);

  useEffect(() => {
    // Lazy-load only the requested language for PrismLight
    if (!language || !registerLanguage) return;

    let cancelled = false;

    const load = async () => {
      const lang = language.toLowerCase();
      const aliasMap: Record<string, string> = {
        js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
        sh: 'bash', shell: 'bash', py: 'python', yml: 'yaml', md: 'markdown',
        html: 'markup', xml: 'markup', csharp: 'cs', 
      };
      const key = aliasMap[lang] || lang;

      const importers: Record<string, () => Promise<any>> = {
        javascript: () => import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
        jsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/jsx'),
        typescript: () => import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
        tsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
        bash: () => import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
        css: () => import('react-syntax-highlighter/dist/esm/languages/prism/css'),
        markup: () => import('react-syntax-highlighter/dist/esm/languages/prism/markup'),
        json: () => import('react-syntax-highlighter/dist/esm/languages/prism/json'),
        yaml: () => import('react-syntax-highlighter/dist/esm/languages/prism/yaml'),
        markdown: () => import('react-syntax-highlighter/dist/esm/languages/prism/markdown'),
        python: () => import('react-syntax-highlighter/dist/esm/languages/prism/python'),
        java: () => import('react-syntax-highlighter/dist/esm/languages/prism/java'),
        go: () => import('react-syntax-highlighter/dist/esm/languages/prism/go'),
        rust: () => import('react-syntax-highlighter/dist/esm/languages/prism/rust'),
        sql: () => import('react-syntax-highlighter/dist/esm/languages/prism/sql'),
        dockerfile: () => import('react-syntax-highlighter/dist/esm/languages/prism/docker'),
        diff: () => import('react-syntax-highlighter/dist/esm/languages/prism/diff'),
        graphql: () => import('react-syntax-highlighter/dist/esm/languages/prism/graphql'),
        php: () => import('react-syntax-highlighter/dist/esm/languages/prism/php'),
        ruby: () => import('react-syntax-highlighter/dist/esm/languages/prism/ruby'),
        c: () => import('react-syntax-highlighter/dist/esm/languages/prism/c'),
        cpp: () => import('react-syntax-highlighter/dist/esm/languages/prism/cpp'),
        cs: () => import('react-syntax-highlighter/dist/esm/languages/prism/csharp'),
      };

      const importer = importers[key];
      if (!importer) return; // Unrecognized language; Prism will still render as plain

      try {
        const mod = await importer();
        if (!cancelled && mod && mod.default) {
          registerLanguage!(key, mod.default);
        }
      } catch {}
    };

    load();
    return () => { cancelled = true; };
  }, [language, registerLanguage]);

  const lines = useMemo(() => code.split('\n').length, [code]);
  const isCollapsible = lines > MAX_COLLAPSED_LINES;
  const showCollapse = isCollapsible && !expanded;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const bgColor = theme === Theme.DARK ? '#0f172a' : '#f8fafc';
  const fgColor = theme === Theme.DARK ? '#e5e7eb' : '#1f2937';

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-white/5 text-xs">
        <span className="font-mono text-neutral-600 dark:text-neutral-300 truncate">{language || 'code'}</span>
        <div className="flex items-center gap-2">
          {isCollapsible && (
            <button className="px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600" onClick={() => setExpanded(s => !s)}>
              {expanded ? '折叠' : '展开'}
            </button>
          )}
          <button className="px-2 py-1 rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600" onClick={handleCopy}>
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>
      <div className="relative">
        {Highlighter ? (
          <Highlighter
            language={language}
            style={styleTheme || undefined}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: 0, background: bgColor, color: fgColor }}
          >
            {code.replace(/\n$/, '')}
          </Highlighter>
        ) : (
          <pre className="p-3 overflow-x-auto custom-scrollbar" style={{ background: bgColor, color: fgColor }}>{code}</pre>
        )}
        {showCollapse && (
          <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{
            background: theme === Theme.DARK
              ? 'linear-gradient(to bottom, rgba(15,23,42,0), rgba(15,23,42,1))'
              : 'linear-gradient(to bottom, rgba(248,250,252,0), rgba(248,250,252,1))'
          }}></div>
        )}
      </div>
    </div>
  );
};

export default CodeBlock;
