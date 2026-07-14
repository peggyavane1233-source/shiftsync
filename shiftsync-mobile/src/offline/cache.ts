/**
 * src/offline/cache.ts
 * PURPOSE: Secure, durable local caching of GET responses (e.g. roster).
 * This ensures workers can view their schedules deep underground.
 */
import { db } from './db';

export const setCache = async (key: string, data: any): Promise<void> => {
  if (!db) return; // Silent fail in dev if no db
  
  const json = JSON.stringify(data);
  const cachedAt = new Date().toISOString();
  
  // Upsert pattern
  await db.runAsync(
    `INSERT OR REPLACE INTO cache (key, json, cached_at) VALUES (?, ?, ?);`,
    [key, json, cachedAt]
  );
};

export const getCache = async <T>(key: string): Promise<{ data: T; cachedAt: string } | null> => {
  if (!db) return null;
  
  const result = await db.getFirstAsync<{ json: string; cached_at: string }>(
    `SELECT json, cached_at FROM cache WHERE key = ?;`,
    [key]
  );
  
  if (!result) return null;
  
  try {
    return {
      data: JSON.parse(result.json) as T,
      cachedAt: result.cached_at,
    };
  } catch (e) {
    return null;
  }
};
