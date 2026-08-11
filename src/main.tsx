import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Auto-update PWA: reload page as soon as a new service worker takes control,
// so returning users always get the latest version without a manual refresh.
registerSW({ immediate: true });

let refreshing = false;
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);
