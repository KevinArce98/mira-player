import * as SecureStore from 'expo-secure-store';

const KEY = 'mira_sync_account_secret';

export const saveSyncSecret = (secret: string) => SecureStore.setItemAsync(KEY, secret);
export const getSyncSecret = () => SecureStore.getItemAsync(KEY);
export const deleteSyncSecret = () => SecureStore.deleteItemAsync(KEY);
