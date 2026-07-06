const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const SYNC_BASE_URL: string = env?.VITE_SYNC_BASE_URL ?? '';

export function isSyncConfigured(): boolean {
  return SYNC_BASE_URL.length > 0;
}
