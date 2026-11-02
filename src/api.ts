const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${configuredApiUrl}${path}`;
}

import { auth } from './firebase';

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    window.dispatchEvent(new CustomEvent('chronos-auth-required'));
    throw new Error('Firebase sign-in is required. The login dialog has been opened.');
  }
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}
