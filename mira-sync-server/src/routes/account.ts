import { Hono } from 'hono';
import { prisma } from '../db.js';
import { accountLookup, generateSecret, hashSecret } from '../identity.js';
import { validateXtreamCredentials } from '../xtream.js';

export const accountRoutes = new Hono();

accountRoutes.post('/resolve', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.servidor || !body?.usuario || !body?.password || !body?.deviceId) {
    return c.json({ error: 'missing_fields' }, 400);
  }

  const ok = await validateXtreamCredentials(body.servidor, body.usuario, body.password);
  if (!ok) return c.json({ error: 'xtream_auth_failed' }, 401);

  const lookup = accountLookup(body.servidor, body.usuario);
  const account = await prisma.account.upsert({
    where: { accountLookup: lookup },
    create: { accountLookup: lookup },
    update: {},
  });

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
    orderBy: { updatedAt: 'asc' },
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
      hasPin: p.pinHash != null,
    })),
  });
});
