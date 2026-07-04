import {
  getPreference,
  PREF_RATING_COMPLETED_COUNT,
  PREF_RATING_LAST_PROMPT_AT,
  PREF_RATING_OPTED_OUT,
  setPreference,
} from '@/db/repositories/preferences';

const MIN_COMPLETED_PLAYBACKS = 3;
const PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export async function recordCompletedPlayback(): Promise<void> {
  const raw = await getPreference(PREF_RATING_COMPLETED_COUNT);
  const count = raw ? Number(raw) || 0 : 0;
  await setPreference(PREF_RATING_COMPLETED_COUNT, String(count + 1));
}

export async function shouldPromptRating(): Promise<boolean> {
  const [optedOut, countRaw, lastRaw] = await Promise.all([
    getPreference(PREF_RATING_OPTED_OUT),
    getPreference(PREF_RATING_COMPLETED_COUNT),
    getPreference(PREF_RATING_LAST_PROMPT_AT),
  ]);
  if (optedOut === '1') return false;
  const count = countRaw ? Number(countRaw) || 0 : 0;
  if (count < MIN_COMPLETED_PLAYBACKS) return false;
  const last = lastRaw ? Number(lastRaw) || 0 : 0;
  return Date.now() - last >= PROMPT_COOLDOWN_MS;
}

export async function markRatingPrompted(): Promise<void> {
  await setPreference(PREF_RATING_LAST_PROMPT_AT, String(Date.now()));
}

export async function deferRating(): Promise<void> {
  await setPreference(PREF_RATING_COMPLETED_COUNT, '0');
}

export async function optOutOfRating(): Promise<void> {
  await setPreference(PREF_RATING_OPTED_OUT, '1');
}
