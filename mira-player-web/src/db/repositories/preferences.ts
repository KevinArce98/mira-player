import { getDatabase } from '@/db';

export async function getPreference(clave: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ valor: string | null }>(
    'SELECT valor FROM preferencias WHERE clave = ?;',
    [clave],
  );
  return row?.valor ?? null;
}

export async function setPreference(clave: string, valor: string | null): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO preferencias (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor;`,
    [clave, valor],
  );
}

export const PREF_SUBTITLE_LANG = 'subtitle_lang';
export const PREF_THEME_MODE = 'theme_mode';
export const PREF_UI_LANGUAGE = 'ui_language';
export const PREF_PARENTAL_ENABLED = 'parental_enabled';
export const PREF_PARENTAL_PIN_HASH = 'parental_pin_hash';
export const PREF_PARENTAL_PIN_SALT = 'parental_pin_salt';
export const PREF_PARENTAL_BLOCKED = 'parental_blocked_categories';

export function catalogSortPrefKey(tipo: string): string {
  return `catalog_sort_${tipo}`;
}

export function categoryOrderPrefKey(tipo: string): string {
  return `category_order_${tipo}`;
}
