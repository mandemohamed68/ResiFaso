import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';
import { getApiUrl } from './lib/api';

try {
  const baseUrl = getApiUrl();
  const hostname = window.location.hostname;
  const isAistudioPreview = hostname.includes('ais-dev') || hostname.includes('ais-pre');

  if (baseUrl && isAistudioPreview) {
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
      
      if (url.startsWith('/api') && !url.startsWith('http')) {
        const newUrl = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        if (input instanceof Request) {
          return originalFetch(new Request(newUrl, input), init);
        }
        return originalFetch(newUrl, init);
      }
      return originalFetch(input, init);
    } as typeof fetch;
  }
} catch (e) {
  console.error("API Proxy initialization failed:", e);
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
