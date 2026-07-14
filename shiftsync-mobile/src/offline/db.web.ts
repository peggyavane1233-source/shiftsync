/**
 * src/offline/db.web.ts
 * PURPOSE: No-op stub for the offline DB on Web.
 * WHY: Web runs the admin portal in an office on wired internet. 
 * expo-sqlite cannot be bundled on Web, and the offline outbox is not needed.
 */

// Mock db object with the exact methods expected by outbox.ts and other consumers.
export const db = {
  execSync: () => {},
  runSync: () => { return { lastInsertRowId: 0, changes: 0 }; },
  getAllSync: () => { return []; },
  getFirstSync: () => null,
  
  execAsync: async () => {},
  runAsync: async () => { return { lastInsertRowId: 0, changes: 0 }; },
  getAllAsync: async () => { return []; },
  getFirstAsync: async () => null,
};

export function initOfflineDB() {
  // No-op on web
}
