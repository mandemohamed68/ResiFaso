export function getApiUrl(): string {
  // Check if we are running in the AI Studio web preview iframe/environment
  const isPreview = typeof window !== 'undefined' && (
    window.location.hostname.includes('run.app') || 
    window.location.hostname.includes('aistudio') ||
    window.location.hostname.includes('googleusercontent.com')
  );

  const isCapacitor = typeof window !== 'undefined' && (
    // @ts-ignore
    window.Capacitor || 
    window.location.protocol === 'capacitor:' ||
    window.location.origin.startsWith('ionic:')
  );

  // If in the web preview and not inside Capacitor, we must use relative paths to avoid mixed-content (HTTPS -> HTTP) and CORS blockages
  if (isPreview && !isCapacitor) {
    return '';
  }

  if (isCapacitor) {
    // Target the deployed production backend for mobile devices running the APK
    return 'http://167.172.39.172:2000';
  }

  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && envUrl !== 'MY_APP_URL' && envUrl !== 'MY_API_URL') {
    return envUrl.replace(/\/$/, '').replace(/\/api$/, '');
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return 'http://167.172.39.172:2000';
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

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers
    });
    return res;
  } catch (err) {
    console.error("apiFetch network error:", err);
    // Return a mock response object to prevent downstream .json() crashes if not checked
    return {
      ok: false,
      status: 0,
      json: async () => ({ error: "Network error" }),
      text: async () => "Network error"
    } as Response;
  }
}
