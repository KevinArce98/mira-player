const activeProfileKey = (acct: string) => `mira_sync_active_profile_${acct}`;
const cursorKey = (profileId: string) => `mira_sync_cursor_${profileId}`;
const stalledSinceKey = (profileId: string) => `mira_sync_stalled_since_${profileId}`;

export function getActiveProfileId(acct: string): string | null {
  return localStorage.getItem(activeProfileKey(acct));
}

export function setActiveProfileId(acct: string, profileId: string): void {
  localStorage.setItem(activeProfileKey(acct), profileId);
}

export function getCursor(profileId: string): number {
  return Number(localStorage.getItem(cursorKey(profileId)) ?? '0');
}

export function setCursor(profileId: string, cursor: number): void {
  localStorage.setItem(cursorKey(profileId), String(cursor));
}

export function getStalledSince(profileId: string): number | null {
  const raw = localStorage.getItem(stalledSinceKey(profileId));
  return raw ? Number(raw) : null;
}

export function setStalledSince(profileId: string, ms: number | null): void {
  if (ms === null) {
    localStorage.removeItem(stalledSinceKey(profileId));
  } else {
    localStorage.setItem(stalledSinceKey(profileId), String(ms));
  }
}
