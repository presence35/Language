import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './ErrorBoundary';
import './index.css';

if ('caches' in window) {
  caches.keys().then((names) => {
    return Promise.all(
      names.map((name) => {
        if (name.includes('pages') || name.includes('workbox')) {
          return caches.delete(name);
        }
        return Promise.resolve();
      })
    );
  });
}

window.addEventListener('unhandledrejection', (e) => {
  console.warn('Unhandled promise rejection:', e.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
