export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('cutline_token');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem('cutline_token', token);
    } else {
      localStorage.removeItem('cutline_token');
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    if (!headers.has('x-cutline-token')) {
      headers.set('x-cutline-token', token);
    }
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
}
