export async function fetchWithAuth(url: string, options: RequestInit = {}, serverToken?: string) {
  let token = serverToken;

  if (typeof window !== 'undefined') {
    // Client-side: extract from document.cookie
    const match = document.cookie.match(new RegExp('(^| )trms_token=([^;]+)'));
    if (match) token = match[2];
  }

  const headers = new Headers(options.headers || {});
  
  // Attach token if available
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'omit', // Switch to omit to prefer Bearer tokens and avoid CORS preflight issues
  });
}
