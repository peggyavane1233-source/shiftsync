/**
 * src/features/auth/tokenStorage.web.ts
 * PURPOSE: Wrapper for token storage on Web (fallback to localStorage since SecureStore breaks).
 */

export const tokenStorage = {
  getItemAsync: async (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItemAsync: async (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
  deleteItemAsync: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};
