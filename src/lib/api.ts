export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // If we are in AI Studio development mode, always use relative paths
  const hostname = window.location.hostname;
  if (hostname.includes('ais-dev') || hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('run.app')) {
    return '';
  }

  const isCapacitor = window.location.protocol === 'capacitor:' ||
                      window.location.origin.startsWith('ionic:') ||
                      ((window as any).Capacitor?.getPlatform?.() === 'ios' || (window as any).Capacitor?.getPlatform?.() === 'android');

  if (isCapacitor) {
    let customUrl = localStorage.getItem('custom_server_url');
    if (customUrl) return customUrl.trim().replace(/\/$/, '');
    
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
    if (envUrl && envUrl !== 'MY_APP_URL' && envUrl !== 'MY_API_URL') {
      return envUrl.replace(/\/$/, '');
    }
    
    // Fallback to the known production URL
    return 'https://resifaso.net';
  }

  // Standard web browser -> use relative paths
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
