/**
 * src/offline/db.native.ts
 * PURPOSE: Initialize expo-sqlite and run the required schema migrations on Native (iOS/Android).
 */
import * as SQLite from 'expo-sqlite';

// We use openDatabaseSync for Expo SDK > 50 (which includes 54)
export const db = SQLite.openDatabaseSync('shiftsync_offline.db');

export function initOfflineDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS outbox (
      client_uuid TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,          
      captured_at TEXT NOT NULL,      
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING'
    );
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY, 
      json TEXT NOT NULL, 
      cached_at TEXT NOT NULL
    );
  `);
}

// Auto-init on import
initOfflineDB();
