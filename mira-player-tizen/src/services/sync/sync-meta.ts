const activeProfileKey = (acct: string) => `mira_sync_active_profile_${acct}`;
const cursorKey = (profileId: string) => `mira_sync_cursor_${profileId}`;

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
