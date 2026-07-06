import { Hono } from 'hono';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../auth.js';

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
  if (!body?.id || !body?.nombre) return c.json({ error: 'missing_fields' }, 400);

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
  if (profile.accountId !== accountId) return c.json({ error: 'forbidden' }, 403);
  return c.json({ profile });
});

profileRoutes.delete('/:id', async (c) => {
  const accountId = c.get('accountId');
  const id = c.req.param('id');
  const existing = await prisma.profile.findFirst({ where: { id, accountId } });
  if (!existing) return c.json({ error: 'not_found' }, 404);
  await prisma.profile.update({
    where: { id },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });
  return c.json({ ok: true });
});
