/**
 * src/features/auth/tokenStorage.native.ts
 * PURPOSE: Wrapper for expo-secure-store on Native platforms.
 */
import * as SecureStore from 'expo-secure-store';

export const tokenStorage = {
  getItemAsync: (key: string) => SecureStore.getItemAsync(key),
  setItemAsync: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key: string) => SecureStore.deleteItemAsync(key),
};
