import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App.tsx';
import './index.css';
import { getApiUrl } from './lib/api';

// Intercept relative API requests and redirect them to the configured server URL (e.g., https://resifaso.net)
const baseUrl = getApiUrl();
if (baseUrl && !window.location.hostname.includes('ais-dev')) {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
        
        if (url.startsWith('/api') && !url.startsWith(baseUrl)) {
          const newUrl = `${baseUrl}${url}`;
          if (input instanceof Request) {
            return originalFetch(new Request(newUrl, input), init);
          }
          return originalFetch(newUrl, init);
        }
        return originalFetch(input, init);
      },
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.error("Failed to redefine fetch:", e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
