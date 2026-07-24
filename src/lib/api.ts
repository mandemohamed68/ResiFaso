export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const win = window as any;

  const sanitizeUrl = (rawUrl: string): string => {
    let url = rawUrl.trim().replace(/\/$/, '');
    // Strip trailing /api if user or env provided it, as paths passed to apiFetch already include /api
    if (url.endsWith('/api')) {
      url = url.substring(0, url.length - 4);
    }
    return url.replace(/\/$/, '');
  };

  // 1. Check if running inside Capacitor (Native Android or iOS App)
  const isCapacitorNative = typeof win.Capacitor !== 'undefined' && (
    win.Capacitor?.isNativePlatform?.() ||
    win.Capacitor?.getPlatform?.() === 'android' ||
    win.Capacitor?.getPlatform?.() === 'ios'
  );

  const isCapacitorProtocol = window.location.protocol === 'capacitor:' ||
                              window.location.protocol === 'file:' ||
                              window.location.origin.startsWith('ionic:');

  const isCapacitor = isCapacitorNative || isCapacitorProtocol;

  if (isCapacitor) {
    const customUrl = localStorage.getItem('custom_server_url');
    if (customUrl && customUrl.trim()) {
      return sanitizeUrl(customUrl);
    }

    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
    if (envUrl && envUrl !== 'MY_APP_URL' && envUrl !== 'MY_API_URL' && envUrl.trim() !== '') {
      return sanitizeUrl(envUrl);
    }

    // Default production backend server for mobile app (Android/iOS)
    return 'https://resifaso.net';
  }

  // 2. Standard Web Browser Mode
  const hostname = window.location.hostname;

  // If in AI Studio, Cloud Run preview, or localhost web dev, use relative paths to reach local server
  if (hostname.includes('ais-dev') || hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('run.app')) {
    const customUrl = localStorage.getItem('custom_server_url');
    if (customUrl && customUrl.trim()) {
      return sanitizeUrl(customUrl);
    }
    return '';
  }

  // Custom server URL if explicitly configured by user
  const customUrl = localStorage.getItem('custom_server_url');
  if (customUrl && customUrl.trim()) {
    return sanitizeUrl(customUrl);
  }

  // Production Web Deployment (same origin)
  return '';
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let baseUrl = getApiUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  // Ensure path starts with /
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Prevent duplicate /api/api/ if path starts with /api/ and baseUrl ends with /api
  if (baseUrl.endsWith('/api') && cleanPath.startsWith('/api/')) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 4);
  }

  let fullUrl = (path.startsWith('http://') || path.startsWith('https://')) 
    ? path 
    : (baseUrl ? `${baseUrl}${cleanPath}` : cleanPath);

  // Clean any accidental double slashes in URL path (e.g. https://domain.com//api/...)
  fullUrl = fullUrl.replace(/([^:]\/)\/+/g, "$1");

  const isExternal = path.startsWith('http://') || path.startsWith('https://');

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization') && !isExternal) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }

  // Set up abort timeout if no signal provided
  const controller = new AbortController();
  let timeoutMs = (options.method && options.method.toUpperCase() !== 'GET') ? 15000 : 7000;
  
  // Increase timeout for payment or Sappay operations to 180 seconds (3 minutes)
  const customTimeout = (options as any).timeout;
  if (customTimeout) {
    timeoutMs = customTimeout;
  } else if (path.includes('/payment') || path.includes('/sappay')) {
    timeoutMs = 180000;
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[apiFetch] Fetching: ${fullUrl}`);
    const res = await fetch(fullUrl, {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[apiFetch] Network error for ${fullUrl}:`, err);
    throw err;
  }
}
