export function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && envUrl !== 'MY_APP_URL' && envUrl !== 'MY_API_URL') {
    return envUrl.replace(/\/$/, '').replace(/\/api$/, '');
  }

  const isCapacitor = typeof window !== 'undefined' && (
    // @ts-ignore
    window.Capacitor || 
    window.location.origin.includes('localhost') || 
    window.location.protocol === 'capacitor:' ||
    window.location.origin.startsWith('ionic:')
  );
  
  if (isCapacitor) {
    // Hardcoded fallback to the active hosted app URL
    return 'https://ais-pre-aeirvgp5kf4pmbaewxhixl-252816219526.europe-west1.run.app';
  }
  return '';
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(fullUrl, {
    ...options,
    headers
  });
}
