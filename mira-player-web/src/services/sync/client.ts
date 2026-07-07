import { SYNC_BASE_URL } from './config';

export interface ResolveResult {
  accountId: string;
  deviceId: string;
  accountSecret: string;
  profiles: {
    id: string;
    nombre: string;
    avatar: string | null;
    isKids: boolean;
    isDefault: boolean;
    hasPin: boolean;
  }[];
}

export interface PushProgress {
  canonicalKey: string;
  posicionSegundos: number;
  duracionTotal: number | null;
  completado: boolean;
  lastWatchedAt: number;
  deletedAt: number | null;
  reset?: boolean;
}

export interface PushFavorite {
  canonicalKey: string;
  createdAt: number;
  deletedAt: number | null;
}

export interface PushBody {
  profileId: string;
  progress?: PushProgress[];
  favorites?: PushFavorite[];
}

export interface PullResult {
  cursor: number;
  progress: PushProgress[];
  favorites: PushFavorite[];
  preferences: { clave: string; valor: string | null; deletedAt: number | null }[];
}

async function request<T>(path: string, init: RequestInit, secret?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers.Authorization = `Bearer ${secret}`;
  const res = await fetch(`${SYNC_BASE_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    throw Object.assign(new Error(`sync_http_${res.status}`), { status: res.status });
  }
  return (await res.json()) as T;
}

export function resolveAccount(input: {
  servidor: string;
  usuario: string;
  password: string;
  deviceId: string;
  platform: string;
}): Promise<ResolveResult> {
  return request<ResolveResult>('/account/resolve', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function pushProfile(
  secret: string,
  id: string,
  nombre: string,
  extra: Record<string, unknown> = {},
) {
  return request<{ profile: unknown }>(
    '/profiles',
    { method: 'POST', body: JSON.stringify({ id, nombre, ...extra }) },
    secret,
  );
}

export interface ServerProfileDto {
  id: string;
  nombre: string;
  avatar: string | null;
  isKids: boolean;
  deletedAt: number | null;
}

export function fetchProfiles(secret: string): Promise<{ profiles: ServerProfileDto[] }> {
  return request<{ profiles: ServerProfileDto[] }>('/profiles', { method: 'GET' }, secret);
}

export function deleteProfileRemote(secret: string, id: string) {
  return request<{ ok: boolean }>(
    `/profiles/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    secret,
  );
}

export function push(secret: string, body: PushBody): Promise<{ cursor: number }> {
  return request<{ cursor: number }>(
    '/sync/push',
    { method: 'POST', body: JSON.stringify(body) },
    secret,
  );
}

export function pull(secret: string, profileId: string, since: number): Promise<PullResult> {
  return request<PullResult>(
    `/sync/pull?profileId=${encodeURIComponent(profileId)}&since=${since}`,
    { method: 'GET' },
    secret,
  );
}
