import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App.tsx';
import './index.css';
import { getApiUrl } from './lib/api';

// Intercept relative API requests and redirect them to the configured server URL (e.g., https://resifaso.net)
const baseUrl = getApiUrl();
if (baseUrl) {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: function (input: RequestInfo | URL, init?: RequestInit) {
        if (typeof input === 'string' && input.startsWith('/api')) {
          return originalFetch(`${baseUrl}${input}`, init);
        } else if (input instanceof Request && input.url.startsWith('/api')) {
          const newUrl = `${baseUrl}${input.url}`;
          const newRequest = new Request(newUrl, input);
          return originalFetch(newRequest, init);
        }
        return originalFetch(input, init);
      },
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.error("Failed to redefine fetch via defineProperty:", e);
    try {
      (window as any).fetch = function (input: any, init: any) {
        if (typeof input === 'string' && input.startsWith('/api')) {
          return originalFetch(`${baseUrl}${input}`, init);
        }
        return originalFetch(input, init);
      };
    } catch (err) {
      console.error("Could not patch window.fetch:", err);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
