import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { prisma } from '../db.js';
import {
  accountLookup,
  canonicalServerHost,
  generateSecret,
  hashSecret,
  normalizeUsuario,
} from '../identity.js';
import { validateXtreamCredentials } from '../xtream.js';
import { logError, logInfo, logWarn } from '../logger.js';

export const accountRoutes = new Hono();

accountRoutes.post('/resolve', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.servidor || !body?.usuario || !body?.password || !body?.deviceId) {
    logWarn('account.resolve.missing_fields', { platform: body?.platform });
    return c.json({ error: 'missing_fields' }, 400);
  }

  const host = canonicalServerHost(body.servidor);
  const usuario = normalizeUsuario(body.usuario);

  const ok = await validateXtreamCredentials(body.servidor, body.usuario, body.password);
  if (!ok) {
    logWarn('account.resolve.xtream_auth_failed', { platform: body.platform, host, usuario });
    return c.json({ error: 'xtream_auth_failed' }, 401);
  }

  const lookup = accountLookup(body.servidor, body.usuario);
  let account = await prisma.account.findUnique({ where: { accountLookup: lookup } });
  const isNewAccount = !account;
  if (!account) {
    try {
      account = await prisma.account.create({
        data: {
          accountLookup: lookup,
          profiles: {
            create: { id: randomUUID(), nombre: 'Principal', isDefault: true },
          },
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        account = await prisma.account.findUnique({ where: { accountLookup: lookup } });
      } else {
        logError('account.resolve.create_failed', { host, usuario, error: String(err) });
        throw err;
      }
    }
  }
  if (!account) {
    logError('account.resolve.account_unavailable', { host, usuario });
    return c.json({ error: 'account_unavailable' }, 500);
  }

  const secret = generateSecret();
  await prisma.device.upsert({
    where: { id: body.deviceId },
    create: {
      id: body.deviceId,
      accountId: account.id,
      platform: body.platform ?? 'unknown',
      secretHash: hashSecret(secret),
    },
    update: {
      accountId: account.id,
      platform: body.platform ?? 'unknown',
      secretHash: hashSecret(secret),
      lastSeenAt: new Date(),
    },
  });

  const profiles = await prisma.profile.findMany({
    where: { accountId: account.id, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'asc' }],
  });

  logInfo('account.resolve.ok', {
    platform: body.platform,
    host,
    usuario,
    accountId: account.id,
    deviceId: body.deviceId,
    isNewAccount,
    profilesCount: profiles.length,
    canonicalProfileId: profiles[0]?.id ?? null,
  });

  return c.json({
    accountId: account.id,
    deviceId: body.deviceId,
    accountSecret: secret,
    profiles: profiles.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      avatar: p.avatar,
      isKids: p.isKids,
      isDefault: p.isDefault,
      hasPin: p.pinHash != null,
    })),
  });
});
