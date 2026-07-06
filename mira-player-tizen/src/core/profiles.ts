export interface Perfil {
  id: string;
  nombre: string;
  avatar: string | null;
  isKids: boolean;
  updatedAt: number;
  deletedAt: number | null;
}

const key = (acct: string) => `mira_profiles_${acct}`;

function read(acct: string): Perfil[] {
  try {
    return JSON.parse(localStorage.getItem(key(acct)) || '[]') as Perfil[];
  } catch {
    return [];
  }
}

function write(acct: string, profiles: Perfil[]): void {
  localStorage.setItem(key(acct), JSON.stringify(profiles));
}

export function listProfiles(acct: string): Perfil[] {
  return read(acct)
    .filter((p) => p.deletedAt === null)
    .sort((a, b) => a.updatedAt - b.updatedAt);
}

export function upsertProfile(
  acct: string,
  input: { id: string; nombre: string; avatar?: string | null; isKids?: boolean; deletedAt?: number | null },
): Perfil {
  const profiles = read(acct);
  const idx = profiles.findIndex((p) => p.id === input.id);
  const now = Date.now();
  const profile: Perfil = {
    id: input.id,
    nombre: input.nombre,
    avatar: input.avatar ?? null,
    isKids: input.isKids ?? false,
    updatedAt: now,
    deletedAt: input.deletedAt ?? null,
  };
  if (idx >= 0) profiles[idx] = profile;
  else profiles.push(profile);
  write(acct, profiles);
  return profile;
}

export function renameProfile(acct: string, id: string, nombre: string): Perfil | null {
  const profiles = read(acct);
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  profiles[idx] = { ...profiles[idx], nombre, updatedAt: Date.now() };
  write(acct, profiles);
  return profiles[idx];
}

export function deleteProfile(acct: string, id: string): void {
  const profiles = read(acct);
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return;
  profiles[idx] = { ...profiles[idx], deletedAt: Date.now(), updatedAt: Date.now() };
  write(acct, profiles);
}
