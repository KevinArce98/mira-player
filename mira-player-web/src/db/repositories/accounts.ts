import { getDatabase } from '@/db';
import { uuid } from '@/lib/id';
import { deletePassword, savePassword } from '@/services/credentials';
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
  savePassword(id, input.password);
  markReauthDone();

  void (async () => {
    const { bootstrapSyncSession } = await import('@/services/sync/bootstrap');
    await bootstrapSyncSession({
      servidor: input.servidor,
      usuario: input.usuario,
      password: input.password,
    });
    const { runSync } = await import('@/services/sync/engine');
    await runSync();
  })().catch((err) => console.warn('[sync] bootstrap failed:', err));

  return {
    id,
    servidor: input.servidor,
    usuario: input.usuario,
    ultima_sincronizacion: existing?.ultima_sincronizacion ?? null,
  };
}

export async function updateLastSync(accountId: string, when: number = Date.now()): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE cuentas SET ultima_sincronizacion = ? WHERE id = ?;', [when, accountId]);
}

export async function deleteAccount(accountId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cuentas WHERE id = ?;', [accountId]);
  deletePassword(accountId);
}
