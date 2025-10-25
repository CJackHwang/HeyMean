
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// You may need to install the following packages:
// npm install marked dompurify
// npm install @types/marked @types/dompurify

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
