export function getApiUrl(): string {
  // Check if we are running in the AI Studio web preview iframe/environment
  const isPreview = typeof window !== 'undefined' && (
    window.location.hostname.includes('run.app') || 
    window.location.hostname.includes('aistudio') ||
    window.location.hostname.includes('googleusercontent.com') ||
    window.location.hostname.includes('web-platform.com') ||
    window.location.hostname.includes('localhost')
  );

  const isCapacitor = typeof window !== 'undefined' && (
    // @ts-ignore
    window.Capacitor || 
    window.location.protocol === 'capacitor:' ||
    window.location.origin.startsWith('ionic:')
  );

  let customUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_server_url') : null;
  if (customUrl) {
    if (customUrl.includes(':2020') || customUrl.includes(':2000') || customUrl.includes('167.172.39.172')) {
      customUrl = 'https://resifaso.net';
      try {
        localStorage.setItem('custom_server_url', customUrl);
      } catch (e) {
        console.error('Failed to update custom_server_url in localStorage', e);
      }
    }
    // Only use customUrl for web if it's explicitly set for dev purposes, but prefer relative paths in production
  }

  // If we're on the web (not a mobile app wrapper), we should use relative paths
  // to avoid CORS issues between www. and non-www. domains.
  if (typeof window !== 'undefined' && !isCapacitor) {
    // Just return empty string to make all fetch requests relative to current origin (e.g. /api/...)
    return '';
  }

  if (isCapacitor) {
    // If a custom URL is saved, use it
    if (customUrl) return customUrl.trim().replace(/\/$/, '');
    
    // Target the deployed production backend for mobile devices running the APK
    // Fallback to the environment URL if available
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
    if (envUrl && envUrl !== 'MY_APP_URL' && envUrl !== 'MY_API_URL') {
      return envUrl.replace(/\/$/, '').replace(/\/api$/, '');
    }
    
    return 'https://resifaso.net'; // Production domain fallback
  }

  // Fallback for server-side rendering or non-browser environments
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && envUrl !== 'MY_APP_URL' && envUrl !== 'MY_API_URL') {
    const cleanUrl = envUrl.replace(/\/$/, '').replace(/\/api$/, '');
    return cleanUrl;
  }
  
  return 'https://resifaso.net';
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
