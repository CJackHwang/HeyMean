// Type declarations for react-syntax-highlighter modules
declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const oneDark: Record<string, unknown>;
  export const oneLight: Record<string, unknown>;
}

declare module 'react-syntax-highlighter/dist/esm/prism-light' {
  import { Component } from 'react';
  
  interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, unknown>;
    PreTag?: string;
    customStyle?: React.CSSProperties;
    children?: React.ReactNode;
  }
  
  export default class PrismLight extends Component<SyntaxHighlighterProps> {
    static registerLanguage(name: string, syntax: unknown): void;
  }
  
  export { PrismLight };
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/javascript' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/jsx' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/typescript' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/tsx' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/bash' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/css' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/markup' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/json' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/yaml' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/markdown' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/python' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/java' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/go' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/rust' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/sql' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/docker' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/diff' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/graphql' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/php' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/ruby' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/c' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/cpp' {
  const syntax: unknown;
  export default syntax;
}

declare module 'react-syntax-highlighter/dist/esm/languages/prism/csharp' {
  const syntax: unknown;
  export default syntax;
}
