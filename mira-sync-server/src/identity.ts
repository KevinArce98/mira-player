import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function normalizeServer(servidor: string): string {
  return servidor.trim().replace(/\/+$/, '').toLowerCase();
}

export function normalizeUsuario(usuario: string): string {
  return usuario.trim().toLowerCase();
}

export function accountLookup(servidor: string, usuario: string): string {
  return createHash('sha256')
    .update(`${normalizeServer(servidor)}|${normalizeUsuario(usuario)}`)
    .digest('hex');
}

export function generateSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
