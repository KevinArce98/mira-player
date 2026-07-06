import Constants from 'expo-constants';

export const SYNC_BASE_URL: string =
  (Constants.expoConfig?.extra?.syncBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_SYNC_BASE_URL ??
  '';

export function isSyncConfigured(): boolean {
  return SYNC_BASE_URL.length > 0;
}
