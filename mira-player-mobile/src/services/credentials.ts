import * as SecureStore from 'expo-secure-store';

function key(accountId: string): string {
  return `xtream_password_${accountId}`;
}

export async function savePassword(accountId: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(key(accountId), password);
}

export async function getPassword(accountId: string): Promise<string | null> {
  return SecureStore.getItemAsync(key(accountId));
}

export async function deletePassword(accountId: string): Promise<void> {
  await SecureStore.deleteItemAsync(key(accountId));
}
