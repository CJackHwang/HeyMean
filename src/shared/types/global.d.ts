// Global type declarations for non-TS assets imported in the app
declare module '*.css' {
  const content: string;
  export default content;
}

// Allow side-effect only CSS imports via dynamic import()
declare module 'katex/dist/katex.min.css';

// Fix for react-dom/client types
declare module 'react-dom/client' {
  export * from 'react-dom';
  import { ReactNode } from 'react';
  
  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }
  
  export function createRoot(container: Element | DocumentFragment): Root;
  export function hydrateRoot(container: Element | DocumentFragment, children: ReactNode): Root;
}

declare global {
  interface Window {
    __hmSettingsReady?: boolean;
    __hmTranslationsReady?: boolean;
  }
}

export {};
