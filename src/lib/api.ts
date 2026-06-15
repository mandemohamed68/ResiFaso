export function getApiUrl(): string {
  const isCapacitor = typeof window !== 'undefined' && (
    // @ts-ignore
    window.Capacitor || 
    window.location.origin.includes('localhost') || 
    window.location.protocol === 'capacitor:' ||
    window.location.origin.startsWith('ionic:')
  );
  
  if (isCapacitor) {
    const configUrl = import.meta.env.VITE_APP_URL;
    if (configUrl && configUrl !== 'MY_APP_URL') {
      return configUrl.replace(/\/$/, '');
    }
    // Hardcoded fallback to the active hosted app URL
    return 'https://ais-pre-aeirvgp5kf4pmbaewxhixl-252816219526.europe-west1.run.app';
  }
  return '';
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const baseUrl = getApiUrl();
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
  return fetch(fullUrl, options);
}
