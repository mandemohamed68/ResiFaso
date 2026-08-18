import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: 20, color: 'red', background: 'white', zIndex: 9999, position: 'relative'}}>
        <h1>Something went wrong.</h1>
        <pre>{this.state.error?.message}</pre>
        <pre>{this.state.error?.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
