/**
 * src/offline/db.ts
 * PURPOSE: TypeScript shim for the offline db module to prevent TS2307 errors.
 */

export const db = {
  execSync: (sql: string): void => {},
  runSync: (sql: string, params?: any[]): { lastInsertRowId: number; changes: number } => ({ lastInsertRowId: 0, changes: 0 }),
  getAllSync: <T>(sql: string, params?: any[]): T[] => [],
  getFirstSync: <T>(sql: string, params?: any[]): T | null => null,
  
  execAsync: async (sql: string): Promise<void> => {},
  runAsync: async (sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }> => ({ lastInsertRowId: 0, changes: 0 }),
  getAllAsync: async <T>(sql: string, params?: any[]): Promise<T[]> => [],
  getFirstAsync: async <T>(sql: string, params?: any[]): Promise<T | null> => null,
};

export function initOfflineDB(): void {}
