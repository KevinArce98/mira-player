import type { Context, Next } from 'hono';
import { prisma } from './db.js';
import { hashSecret } from './identity.js';
import { logWarn } from './logger.js';

export type AuthVars = {
  accountId: string;
  deviceId: string;
};

export async function requireAuth(c: Context<{ Variables: AuthVars }>, next: Next) {
  const header = c.req.header('Authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    logWarn('auth.missing_bearer', { path: c.req.path });
    return c.json({ error: 'missing_bearer' }, 401);
  }

  const device = await prisma.device.findUnique({
    where: { secretHash: hashSecret(match[1]) },
  });
  if (!device) {
    logWarn('auth.invalid_secret', { path: c.req.path, secretPrefix: match[1].slice(0, 8) });
    return c.json({ error: 'invalid_secret' }, 401);
  }

  await prisma.device.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  c.set('accountId', device.accountId);
  c.set('deviceId', device.id);
  await next();
}

export async function assertProfileInAccount(
  accountId: string,
  profileId: string,
): Promise<boolean> {
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, accountId },
    select: { id: true },
  });
  return profile != null;
}
