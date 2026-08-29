export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('trms_token');
  }

  const headers = new Headers(options.headers || {});
  
  // Attach token if available
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Keep credentials include for fallback to cookie if someone wants it, 
  // but mostly relying on Authorization Header now.
  return fetch(url, {
    ...options,
    headers,
    credentials: 'omit', // Switch to omit to prefer Bearer tokens and avoid CORS preflight issues
  });
}
