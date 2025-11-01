// Global type declarations for non-TS assets imported in the app
declare module '*.css' {
  const content: string;
  export default content;
}

// Allow side-effect only CSS imports via dynamic import()
declare module 'katex/dist/katex.min.css';
