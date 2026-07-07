import { Hono } from 'hono';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../auth.js';
import { logInfo, logWarn } from '../logger.js';

export const profileRoutes = new Hono<{ Variables: AuthVars }>();

profileRoutes.use('*', requireAuth);

function toMs(d: Date | null): number | null {
  return d ? d.getTime() : null;
}

profileRoutes.get('/', async (c) => {
  const accountId = c.get('accountId');
  const profiles = await prisma.profile.findMany({
    where: { accountId },
    orderBy: { updatedAt: 'asc' },
  });
  return c.json({
    profiles: profiles.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      avatar: p.avatar,
      isKids: p.isKids,
      deletedAt: toMs(p.deletedAt),
    })),
  });
});

profileRoutes.post('/', async (c) => {
  const accountId = c.get('accountId');
  const body = await c.req.json().catch(() => null);
  if (!body?.id || !body?.nombre) {
    logWarn('profiles.create.missing_fields', { accountId });
    return c.json({ error: 'missing_fields' }, 400);
  }

  const existing = await prisma.profile.findUnique({ where: { id: body.id }, select: { accountId: true } });
  if (existing && existing.accountId !== accountId) {
    logWarn('profiles.create.forbidden', { accountId, profileId: body.id, ownerAccountId: existing.accountId });
    return c.json({ error: 'forbidden' }, 403);
  }

  const profile = await prisma.profile.upsert({
    where: { id: body.id },
    create: {
      id: body.id,
      accountId,
      nombre: body.nombre,
      avatar: body.avatar ?? null,
      isKids: Boolean(body.isKids),
      pinHash: body.pinHash ?? null,
      pinSalt: body.pinSalt ?? null,
    },
    update: {
      nombre: body.nombre,
      avatar: body.avatar ?? null,
      isKids: Boolean(body.isKids),
      pinHash: body.pinHash ?? null,
      pinSalt: body.pinSalt ?? null,
      updatedAt: new Date(),
    },
  });
  logInfo('profiles.create.ok', { accountId, profileId: profile.id, nombre: profile.nombre });
  return c.json({ profile });
});

profileRoutes.delete('/:id', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const existing = await prisma.profile.findFirst({ where: { id, accountId } });
  if (!existing) {
    logWarn('profiles.delete.not_found', { accountId, profileId: id });
    return c.json({ error: 'not_found' }, 404);
  }
  await prisma.profile.update({
    where: { id },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });
  logInfo('profiles.delete.ok', { accountId, profileId: id });
  return c.json({ ok: true });
});
