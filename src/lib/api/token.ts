/**
 * Access-token persistence. The bearer token returned by the login route is
 * kept in `expo-secure-store` on native platforms. SecureStore has no web
 * implementation, so web falls back to `localStorage` (the platform the
 * reference app used).
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'bt_access_token';
const isWeb = Platform.OS === 'web';

export async function getToken(): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Deleting a missing/invalid key is a no-op for our purposes.
  }
}
