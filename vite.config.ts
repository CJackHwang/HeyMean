import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
  return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              // Fine-grained vendor chunking to avoid a giant vendor bundle
              if (id.includes('react-syntax-highlighter')) return 'vendor-highlighter';
              if (id.includes('katex')) return 'vendor-katex';
              if (id.includes('/react/')) return 'vendor-react';
              if (id.includes('react-dom')) return 'vendor-react';
              if (id.includes('react-router')) return 'vendor-router';
              if (id.includes('@google/genai')) return 'vendor-ai';
              if (id.match(/remark-|rehype-|unified|micromark|mdast|hast/)) return 'vendor-markdown';
              if (id.includes('@tanstack/react-virtual')) return 'vendor-virtual';
              // Fallback: one vendor chunk per package name
              const m = id.split('node_modules/')[1];
              if (m) {
                const parts = m.split('/');
                const pkg = m.startsWith('@') ? `${parts[0]}__${parts[1]}` : parts[0];
                return `vendor-${pkg.replace(/[^a-zA-Z0-9_]/g, '_')}`;
              }
              return 'vendor';
            }
          }
        },
        chunkSizeWarningLimit: 1500
      }
    };
});
