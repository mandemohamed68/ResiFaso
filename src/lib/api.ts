export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const win = window as any;

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
      return customUrl.trim().replace(/\/$/, '');
    }

    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
    if (envUrl && envUrl !== 'MY_APP_URL' && envUrl !== 'MY_API_URL' && envUrl.trim() !== '') {
      return envUrl.trim().replace(/\/$/, '');
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
      return customUrl.trim().replace(/\/$/, '');
    }
    return '';
  }

  // Custom server URL if explicitly configured by user
  const customUrl = localStorage.getItem('custom_server_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/$/, '');
  }

  // Production Web Deployment (same origin)
  return '';
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Use absolute URL if path doesn't already have one and baseUrl exists
  const fullUrl = (path.startsWith('http://') || path.startsWith('https://')) 
    ? path 
    : (baseUrl ? `${baseUrl}${cleanPath}` : cleanPath);

  const isExternal = path.startsWith('http://') || path.startsWith('https://');

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization') && !isExternal) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    console.log(`[apiFetch] Fetching: ${fullUrl}`);
    const res = await fetch(fullUrl, {
      ...options,
      headers
    });
    return res;
  } catch (err) {
    console.error(`[apiFetch] Network error for ${fullUrl}:`, err);
    throw err;
  }
}
