import { getDatabase } from '@/db';
import { uuid } from '@/lib/id';
import { DEMO_SERVER } from '@/services/demo';
import { deletePassword, savePassword } from '@/services/credentials';
import { bootstrapSyncSession } from '@/services/sync/bootstrap';
import { markReauthDone } from '@/services/session-reauth';
import type { Cuenta } from '@/types/models';

export async function getAccount(): Promise<Cuenta | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Cuenta>('SELECT * FROM cuentas LIMIT 1;');
  return row ?? null;
}

export async function saveAccount(input: {
  servidor: string;
  usuario: string;
  password: string;
}): Promise<Cuenta> {
  const db = await getDatabase();
  const existing = await getAccount();
  const id = existing?.id ?? uuid();

  await db.runAsync(
    `INSERT INTO cuentas (id, servidor, usuario, ultima_sincronizacion)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET servidor = excluded.servidor, usuario = excluded.usuario;`,
    [id, input.servidor, input.usuario, existing?.ultima_sincronizacion ?? null],
  );
  await savePassword(id, input.password);
  await markReauthDone();

  void bootstrapSyncSession({
    servidor: input.servidor,
    usuario: input.usuario,
    password: input.password,
  })
    .then(async () => {
      const { runSync } = await import('@/services/sync/engine');
      await runSync();
    })
    .catch((err) => console.warn('[sync] bootstrap failed:', err));

  return {
    id,
    servidor: input.servidor,
    usuario: input.usuario,
    ultima_sincronizacion: existing?.ultima_sincronizacion ?? null,
  };
}

export async function saveDemoAccount(): Promise<Cuenta> {
  return saveAccount({ servidor: DEMO_SERVER, usuario: 'demo', password: 'demo' });
}

export async function updateLastSync(accountId: string, when: number = Date.now()): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE cuentas SET ultima_sincronizacion = ? WHERE id = ?;', [when, accountId]);
}

export async function deleteAccount(accountId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cuentas WHERE id = ?;', [accountId]);
  await deletePassword(accountId);
}
