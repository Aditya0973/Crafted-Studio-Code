import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[DEBUG LOG 1] Renderer main.tsx started');

window.addEventListener('unhandledrejection', (event) => {
  console.error('[DEBUG UNHANDLED REJECTION]', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[DEBUG UNCAUGHT ERROR]', event.error || event.message);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
