
import { StrictMode } from 'react';
// Preload critical fonts as early as possible
import '@app/assets/fonts-preload';
import '@app/assets/index.css';
import { createRoot } from 'react-dom/client';
import App from '@app/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register a minimal service worker in production builds only
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
