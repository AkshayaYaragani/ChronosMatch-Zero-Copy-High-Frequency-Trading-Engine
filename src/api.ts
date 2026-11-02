const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${configuredApiUrl}${path}`;
}

import { auth } from './firebase';
import { signOut } from 'firebase/auth';

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    window.dispatchEvent(new CustomEvent('chronos-auth-required'));
    throw new Error('Firebase sign-in is required. The login dialog has been opened.');
  }
  const requestWithToken = async (forceRefresh: boolean): Promise<Response> => {
    const token = await user.getIdToken(forceRefresh);
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(apiUrl(path), { ...init, headers });
  };

  let response = await requestWithToken(false);
  if (response.status !== 401) {
    return response;
  }

  response = await requestWithToken(true);
  if (response.status !== 401) {
    return response;
  }

  await signOut(auth);
  window.dispatchEvent(new CustomEvent('chronos-auth-required'));
  throw new Error('Firebase authentication expired or is not configured for this backend. Please sign in again.');
}
