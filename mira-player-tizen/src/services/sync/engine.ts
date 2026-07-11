import { getSession, type Session } from '@/core/session';
import { createId } from '@/core/id';
import { loadAccount } from '@/core/store';
import { progressKey, type MediaItem, type ResumePayload } from '@/core/media';
import { listAllProgressEntries, applyRemoteProgress, markAllSynced } from '@/core/progress';
import { listAllFavoriteEntries, applyRemoteFavorite } from '@/core/favorites';
import { listProfiles, upsertProfile } from '@/core/profiles';
import { buildFavoriteCanonicalKey } from './canonical';
import {
  getActiveProfileId,
  getCursor,
  getStalledSince,
  setActiveProfileId,
  setCursor,
  setStalledSince,
} from './sync-meta';
import { deleteSyncSecret, getSyncSecret } from './secret-store';
import { isSyncConfigured } from './config';
import { fetchProfiles, pull, push, type PushFavorite, type PushProgress } from './client';

function isUnauthorized(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: number }).status === 401;
}

type ParsedKey =
  | { kind: 'movie'; id: number }
  | { kind: 'live'; id: number }
  | { kind: 'series'; seriesId: number; season: number | null; episodeNum: number | null };

function parseKey(key: string): ParsedKey | null {
  const parts = key.split(':');
  if (parts[0] === 'series' && parts.length === 4) {
    return { kind: 'series', seriesId: Number(parts[1]), season: Number(parts[2]), episodeNum: Number(parts[3]) };
  }
  if (parts[0] === 'series' && parts.length === 2) {
    return { kind: 'series', seriesId: Number(parts[1]), season: null, episodeNum: null };
  }
  if (parts[0] === 'movie' && parts.length === 2) {
    return { kind: 'movie', id: Number(parts[1]) };
  }
  if (parts[0] === 'live' && parts.length === 2) {
    return { kind: 'live', id: Number(parts[1]) };
  }
  return null;
}

let running = false;

export async function runSync(): Promise<{ ok: boolean; reason?: string }> {
  if (running) return { ok: false, reason: 'busy' };
  if (!isSyncConfigured()) return { ok: false, reason: 'not_configured' };

  const secret = getSyncSecret();
  if (!secret) return { ok: false, reason: 'no_session' };

  let session: Session;
  try {
    session = getSession();
  } catch {
    return { ok: false, reason: 'no_session' };
  }

  const { acctKey } = session;
  const profileId = getActiveProfileId(acctKey);
  if (!profileId) return { ok: false, reason: 'no_profile' };

  running = true;
  try {
    await pushAll(secret, profileId, acctKey);
    await pullProfiles(secret, acctKey);
    await pullAndApply(secret, profileId, acctKey, session);
    return { ok: true };
  } catch (err) {
    console.warn('[sync] runSync failed:', err);
    if (isUnauthorized(err)) await recoverFromInvalidSecret(acctKey);
    return { ok: false, reason: (err as Error).message };
  } finally {
    running = false;
  }
}

function ownsEntry(entryProfileId: string | null, profileId: string): boolean {
  return entryProfileId === null || entryProfileId === profileId;
}

async function pushAll(secret: string, profileId: string, acctKey: string): Promise<void> {
  const progressEntries = listAllProgressEntries(acctKey).filter(
    (e) => e.resume.kind !== 'live' && ownsEntry(e.profileId, profileId),
  );
  const progress: PushProgress[] = progressEntries.map((e) => ({
    canonicalKey: progressKey(e.resume),
    posicionSegundos: Math.round(e.positionMs / 1000),
    duracionTotal: e.durationMs > 0 ? Math.round(e.durationMs / 1000) : null,
    completado: Boolean(e.completado),
    lastWatchedAt: e.updatedAt,
    deletedAt: e.deletedAt,
  }));

  const favorites: PushFavorite[] = listAllFavoriteEntries(acctKey)
    .filter((e) => ownsEntry(e.profileId, profileId))
    .map((e) => ({
      canonicalKey: buildFavoriteCanonicalKey(e.item.kind, e.item.id),
      createdAt: e.createdAt,
      deletedAt: e.deletedAt,
    }));

  if (progress.length === 0 && favorites.length === 0) return;
  await push(secret, { profileId, progress, favorites });
  markAllSynced(acctKey, Date.now(), profileId);
}

async function pullProfiles(secret: string, acctKey: string): Promise<void> {
  const { profiles } = await fetchProfiles(secret);
  for (const p of profiles) {
    upsertProfile(acctKey, {
      id: p.id,
      nombre: p.nombre,
      avatar: p.avatar,
      isKids: p.isKids,
      deletedAt: p.deletedAt,
    });
  }

  const active = getActiveProfileId(acctKey);
  const remaining = listProfiles(acctKey);
  if (!active || !remaining.some((r) => r.id === active)) {
    const fallback = remaining[0]?.id ?? upsertProfile(acctKey, { id: createId(), nombre: 'Principal' }).id;
    setActiveProfileId(acctKey, fallback);
  }
}
const STALL_TIMEOUT_MS = 24 * 60 * 60 * 1000;

async function pullAndApply(
  secret: string,
  profileId: string,
  acctKey: string,
  session: Session,
): Promise<void> {
  const since = getCursor(profileId);
  const result = await pull(secret, profileId, since);

  let allResolved = true;
  for (const item of result.progress) {
    if (!(await applyPulledProgress(acctKey, session, item, profileId))) allResolved = false;
  }
  for (const item of result.favorites) {
    if (!(await applyPulledFavorite(acctKey, session, item, profileId))) allResolved = false;
  }

  if (allResolved) {
    setStalledSince(profileId, null);
    setCursor(profileId, result.cursor);
    return;
  }

  const stalledSince = getStalledSince(profileId);
  if (stalledSince === null) {
    setStalledSince(profileId, Date.now());
    console.warn('[sync] some pulled items could not resolve to local content, will retry next sync');
    return;
  }

  if (Date.now() - stalledSince > STALL_TIMEOUT_MS) {
    console.warn('[sync] giving up on unresolved pulled items after 24h, forcing cursor forward', {
      profileId,
      since,
      newCursor: result.cursor,
    });
    setStalledSince(profileId, null);
    setCursor(profileId, result.cursor);
  }
}

async function applyPulledFavorite(
  acctKey: string,
  session: Session,
  item: PushFavorite,
  profileId: string,
): Promise<boolean> {
  const parsed = parseKey(item.canonicalKey);
  if (!parsed) return false;

  const kind = parsed.kind === 'series' ? 'series' : parsed.kind;
  const id = parsed.kind === 'series' ? parsed.seriesId : parsed.id;
  try {
    const list = await session.library.all(kind);
    const mediaItem = list.find((i) => i.id === id);
    if (!mediaItem) return false;

    applyRemoteFavorite(acctKey, mediaItem, item.createdAt, item.deletedAt, profileId);
    return true;
  } catch (err) {
    console.warn('[sync] failed to resolve favorite', item.canonicalKey, err);
    return false;
  }
}

async function applyPulledProgress(
  acctKey: string,
  session: Session,
  item: PushProgress,
  profileId: string,
): Promise<boolean> {
  const parsed = parseKey(item.canonicalKey);
  if (!parsed) return false;
  if (parsed.kind === 'live') return true;

  const positionMs = item.posicionSegundos * 1000;
  const durationMs = (item.duracionTotal ?? 0) * 1000;

  try {
    if (parsed.kind === 'movie') {
      const list = await session.library.all('movie');
      const mediaItem = list.find((i) => i.id === parsed.id);
      if (!mediaItem) return false;
      const resume: ResumePayload = {
        kind: 'movie',
        streamId: parsed.id,
        ext: mediaItem.containerExtension || 'mp4',
      };
      applyRemoteProgress(
        acctKey,
        {
          key: progressKey(resume),
          item: mediaItem,
          resume,
          positionMs,
          durationMs,
          updatedAt: item.lastWatchedAt,
          completado: item.completado,
          deletedAt: item.deletedAt,
          syncedAt: Date.now(),
          profileId,
        },
        profileId,
      );
      return true;
    }

    if (parsed.season == null || parsed.episodeNum == null) return true;
    const info = await session.client.seriesInfo(parsed.seriesId);
    const seasonEps = info.episodes[String(parsed.season)] ?? [];
    const ep = seasonEps.find((e) => Number(e.episode_num) === parsed.episodeNum);
    if (!ep) return false;

    const seriesList = await session.library.all('series');
    const seriesItem = seriesList.find((i) => i.id === parsed.seriesId);
    const title = `${seriesItem?.name ?? info.info.name ?? ''} — ${ep.title}`;
    const resume: ResumePayload = {
      kind: 'series',
      episodeId: ep.id,
      ext: ep.container_extension || 'mp4',
      seriesId: parsed.seriesId,
      title,
      season: parsed.season,
      episodeNum: parsed.episodeNum,
    };
    const mediaItem: MediaItem = {
      kind: 'series',
      id: parsed.seriesId,
      name: title,
      icon: seriesItem?.icon ?? null,
    };
    applyRemoteProgress(
      acctKey,
      {
        key: progressKey(resume),
        item: mediaItem,
        resume,
        positionMs,
        durationMs,
        updatedAt: item.lastWatchedAt,
        completado: item.completado,
        deletedAt: item.deletedAt,
        syncedAt: Date.now(),
        profileId,
      },
      profileId,
    );
    return true;
  } catch (err) {
    console.warn('[sync] failed to resolve progress', item.canonicalKey, err);
    return false;
  }
}

async function recoverFromInvalidSecret(acctKey: string): Promise<void> {
  console.warn('[sync] secret rejected by server, clearing and re-bootstrapping');
  deleteSyncSecret();
  const account = loadAccount();
  if (!account) return;
  const { ensureSyncBootstrapped } = await import('./bootstrap');
  await ensureSyncBootstrapped(account, acctKey);
}
