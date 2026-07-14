/**
 * src/features/auth/tokenStorage.ts
 * PURPOSE: TypeScript needs this to know the module exists before platform resolution kicks in.
 */
export const tokenStorage = {
  getItemAsync: async (key: string): Promise<string | null> => null,
  setItemAsync: async (key: string, value: string): Promise<void> => {},
  deleteItemAsync: async (key: string): Promise<void> => {},
};
