const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${configuredApiUrl}${path}`;
}

import { auth } from './firebase';

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}
