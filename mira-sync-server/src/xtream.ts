import { normalizeServer } from './identity.js';

export async function validateXtreamCredentials(
  servidor: string,
  usuario: string,
  password: string,
): Promise<boolean> {
  if (process.env.XTREAM_VALIDATE === 'false') return true;

  const base = normalizeServer(servidor);
  const url = `${base}/player_api.php?username=${encodeURIComponent(usuario)}&password=${encodeURIComponent(password)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return false;
    const data = (await res.json()) as { user_info?: { auth?: number; status?: string } };
    return data?.user_info?.auth === 1;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
