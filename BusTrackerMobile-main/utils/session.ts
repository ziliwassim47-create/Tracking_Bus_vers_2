import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const SESSION_KEY = 'busTrackerMobileSession';

export interface AuthSession {
  token: string;
  refresh_token?: string;
  expires_at?: string;
  session_expires_at?: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: 'ADMIN' | 'PARENT' | 'DRIVER' | 'ASSISTANT';
  };
}

let cachedSession: AuthSession | null | undefined;

export async function getSession(): Promise<AuthSession | null> {
  if (cachedSession !== undefined) return cachedSession;
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  try {
    cachedSession = raw ? JSON.parse(raw) : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession ?? null;
}

export async function saveSession(session: AuthSession): Promise<void> {
  cachedSession = session;
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  cachedSession = null;
  await AsyncStorage.removeItem(SESSION_KEY);
}

async function refreshSession(session: AuthSession): Promise<AuthSession> {
  if (!session.refresh_token) throw new Error('Session expirée. Veuillez vous reconnecter.');
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    await clearSession();
    throw new Error(payload.error || 'Session expirée. Veuillez vous reconnecter.');
  }
  const renewed = { ...session, ...payload } as AuthSession;
  await saveSession(renewed);
  return renewed;
}

export async function authenticatedRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const session = await getSession();
  if (!session?.token) throw new Error('Authentification requise.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && retry) {
    await refreshSession(session);
    return authenticatedRequest<T>(path, options, false);
  }
  if (!response.ok) throw new Error(payload.error || payload.message || `Erreur HTTP ${response.status}`);
  return payload as T;
}

export async function logoutSession(): Promise<void> {
  const session = await getSession();
  try {
    if (session?.token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      });
    }
  } catch {
    // La session locale doit toujours être supprimée, même si le serveur est indisponible.
  } finally {
    await clearSession();
  }
}
