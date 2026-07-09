import { Hono } from 'hono';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth, assertProfileInAccount, type AuthVars } from '../auth.js';
import { isValidCanonicalKey } from '../canonical.js';
import {
  mergeProgress,
  mergeFavorite,
  mergePreference,
  type ProgressFields,
  type FavoriteFields,
} from '../merge.js';
import { logInfo, logWarn } from '../logger.js';

export const syncRoutes = new Hono<{ Variables: AuthVars }>();

syncRoutes.use('*', requireAuth);

function toMs(d: Date | null): number | null {
  return d ? d.getTime() : null;
}
function fromMs(ms: number | null | undefined): Date | null {
  return ms != null ? new Date(ms) : null;
}

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

function clampTimestamp(value: number, now: number): number {
  if (!Number.isFinite(value)) return now;
  return Math.min(value, now + MAX_FUTURE_SKEW_MS);
}

function finiteOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (err) {
      const isConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
      if (!isConflict || attempt === maxAttempts) throw err;
    }
  }
  throw new Error('unreachable');
}

const PULL_CURSOR_SAFETY_MARGIN_MS = 2000;

syncRoutes.get('/pull', async (c) => {
  const accountId = c.get('accountId');
  const deviceId = c.get('deviceId');
  const profileId = c.req.query('profileId');
  const since = Number(c.req.query('since') ?? '0');
  if (!profileId) return c.json({ error: 'missing_profile' }, 400);
  if (!(await assertProfileInAccount(accountId, profileId))) {
    logWarn('sync.pull.forbidden', { accountId, deviceId, profileId });
    return c.json({ error: 'forbidden' }, 403);
  }

  const sinceDate = new Date(Number.isFinite(since) ? since : 0);
  const where = { profileId, updatedAt: { gt: sinceDate } };

  const [progress, favorites, preferences] = await Promise.all([
    prisma.progress.findMany({ where, orderBy: { updatedAt: 'asc' } }),
    prisma.favorite.findMany({ where, orderBy: { updatedAt: 'asc' } }),
    prisma.preference.findMany({ where, orderBy: { updatedAt: 'asc' } }),
  ]);

  let cursor = since;
  const bump = (d: Date) => {
    cursor = Math.max(cursor, d.getTime());
  };

  const out = {
    cursor: 0,
    progress: progress.map((p) => {
      bump(p.updatedAt);
      return {
        canonicalKey: p.canonicalKey,
        posicionSegundos: p.posicionSegundos,
        duracionTotal: p.duracionTotal,
        completado: p.completado,
        lastWatchedAt: Number(p.lastWatchedAt),
        deletedAt: toMs(p.deletedAt),
      };
    }),
    favorites: favorites.map((f) => {
      bump(f.updatedAt);
      return {
        canonicalKey: f.canonicalKey,
        createdAt: Number(f.createdAt),
        deletedAt: toMs(f.deletedAt),
      };
    }),
    preferences: preferences.map((pref) => {
      bump(pref.updatedAt);
      return {
        clave: pref.clave,
        valor: pref.valor,
        deletedAt: toMs(pref.deletedAt),
      };
    }),
  };
  out.cursor = Math.max(since, Math.min(cursor, Date.now() - PULL_CURSOR_SAFETY_MARGIN_MS));
  logInfo('sync.pull.ok', {
    accountId,
    deviceId,
    profileId,
    since,
    progressCount: out.progress.length,
    favoritesCount: out.favorites.length,
    preferencesCount: out.preferences.length,
    cursor: out.cursor,
  });
  return c.json(out);
});

syncRoutes.post('/push', async (c) => {
  const accountId = c.get('accountId');
  const deviceId = c.get('deviceId');
  const body = await c.req.json().catch(() => null);
  const profileId = body?.profileId;
  if (!profileId) return c.json({ error: 'missing_profile' }, 400);
  if (!(await assertProfileInAccount(accountId, profileId))) {
    logWarn('sync.push.forbidden', { accountId, deviceId, profileId });
    return c.json({ error: 'forbidden' }, 403);
  }

  const now = new Date();
  const nowMs = now.getTime();
  const progressItems = Array.isArray(body.progress) ? body.progress : [];
  const favoriteItems = Array.isArray(body.favorites) ? body.favorites : [];
  const preferenceItems = Array.isArray(body.preferences) ? body.preferences : [];
  let progressSkipped = 0;
  let favoritesSkipped = 0;

  await runSerializable(async (tx) => {
    for (const item of progressItems) {
      if (!isValidCanonicalKey(item.canonicalKey)) {
        progressSkipped += 1;
        continue;
      }
      const posicionSegundos = finiteOrNull(item.posicionSegundos ?? 0);
      const lastWatchedAt = finiteOrNull(item.lastWatchedAt ?? 0);
      const duracionTotal = item.duracionTotal == null ? null : finiteOrNull(item.duracionTotal);
      if (posicionSegundos === null || lastWatchedAt === null) {
        progressSkipped += 1;
        continue;
      }
      const existing = await tx.progress.findUnique({
        where: { profileId_canonicalKey: { profileId, canonicalKey: item.canonicalKey } },
      });
      const current: ProgressFields | null = existing
        ? {
            posicionSegundos: existing.posicionSegundos,
            duracionTotal: existing.duracionTotal,
            completado: existing.completado,
            lastWatchedAt: Number(existing.lastWatchedAt),
            deletedAt: toMs(existing.deletedAt),
          }
        : null;
      const merged = mergeProgress(current, {
        posicionSegundos,
        duracionTotal,
        completado: Boolean(item.completado),
        lastWatchedAt: clampTimestamp(lastWatchedAt, nowMs),
        deletedAt: item.deletedAt == null ? null : clampTimestamp(Number(item.deletedAt), nowMs),
        reset: Boolean(item.reset),
      });
      await tx.progress.upsert({
        where: { profileId_canonicalKey: { profileId, canonicalKey: item.canonicalKey } },
        create: {
          profileId,
          canonicalKey: item.canonicalKey,
          posicionSegundos: merged.posicionSegundos,
          duracionTotal: merged.duracionTotal,
          completado: merged.completado,
          lastWatchedAt: BigInt(merged.lastWatchedAt),
          deletedAt: fromMs(merged.deletedAt),
          deviceId,
          updatedAt: now,
        },
        update: {
          posicionSegundos: merged.posicionSegundos,
          duracionTotal: merged.duracionTotal,
          completado: merged.completado,
          lastWatchedAt: BigInt(merged.lastWatchedAt),
          deletedAt: fromMs(merged.deletedAt),
          deviceId,
          updatedAt: now,
        },
      });
    }

    for (const item of favoriteItems) {
      if (!isValidCanonicalKey(item.canonicalKey)) {
        favoritesSkipped += 1;
        continue;
      }
      const createdAt = finiteOrNull(item.createdAt ?? Date.now());
      if (createdAt === null) {
        favoritesSkipped += 1;
        continue;
      }
      const existing = await tx.favorite.findUnique({
        where: { profileId_canonicalKey: { profileId, canonicalKey: item.canonicalKey } },
      });
      const current: FavoriteFields | null = existing
        ? { createdAt: Number(existing.createdAt), deletedAt: toMs(existing.deletedAt) }
        : null;
      const merged = mergeFavorite(current, {
        createdAt: clampTimestamp(createdAt, nowMs),
        deletedAt: item.deletedAt == null ? null : clampTimestamp(Number(item.deletedAt), nowMs),
      });
      await tx.favorite.upsert({
        where: { profileId_canonicalKey: { profileId, canonicalKey: item.canonicalKey } },
        create: {
          profileId,
          canonicalKey: item.canonicalKey,
          createdAt: BigInt(merged.createdAt),
          deletedAt: fromMs(merged.deletedAt),
          deviceId,
          updatedAt: now,
        },
        update: {
          createdAt: BigInt(merged.createdAt),
          deletedAt: fromMs(merged.deletedAt),
          deviceId,
          updatedAt: now,
        },
      });
    }

    for (const item of preferenceItems) {
      if (typeof item.clave !== 'string') continue;
      const clientUpdatedAt = finiteOrNull(item.clientUpdatedAt ?? Date.now());
      if (clientUpdatedAt === null) continue;
      const existing = await tx.preference.findUnique({
        where: { profileId_clave: { profileId, clave: item.clave } },
      });
      const merged = mergePreference(
        existing
          ? { valor: existing.valor, clientUpdatedAt: Number(existing.clientUpdatedAt), deletedAt: toMs(existing.deletedAt) }
          : null,
        {
          valor: item.valor ?? null,
          clientUpdatedAt: clampTimestamp(clientUpdatedAt, nowMs),
          deletedAt: item.deletedAt == null ? null : clampTimestamp(Number(item.deletedAt), nowMs),
        },
      );
      await tx.preference.upsert({
        where: { profileId_clave: { profileId, clave: item.clave } },
        create: {
          profileId,
          clave: item.clave,
          valor: merged.valor,
          clientUpdatedAt: BigInt(merged.clientUpdatedAt),
          deletedAt: fromMs(merged.deletedAt),
          deviceId,
          updatedAt: now,
        },
        update: {
          valor: merged.valor,
          clientUpdatedAt: BigInt(merged.clientUpdatedAt),
          deletedAt: fromMs(merged.deletedAt),
          deviceId,
          updatedAt: now,
        },
      });
    }
  });

  logInfo('sync.push.ok', {
    accountId,
    deviceId,
    profileId,
    progressReceived: progressItems.length,
    progressSkipped,
    favoritesReceived: favoriteItems.length,
    favoritesSkipped,
    preferencesReceived: preferenceItems.length,
    cursor: now.getTime(),
  });

  return c.json({ cursor: now.getTime() });
});
