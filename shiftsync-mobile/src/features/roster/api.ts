/**
 * src/features/roster/api.ts
 * PURPOSE: Data fetching layer for the Worker Roster, with built-in SQLite caching.
 */
import { apiClient } from '../../api/client';
import { setCache, getCache } from '../../offline/cache';
import { ShiftWithAssignment } from '../../api/types';

export interface RosterResponse {
  shifts: ShiftWithAssignment[];
  isFromCache: boolean;
  cachedAt?: string;
}

export const fetchRoster = async (): Promise<RosterResponse> => {
  try {
    const shifts = await apiClient.shifts.listMine();
    // Save to durable cache
    await setCache('roster', shifts);
    return { shifts, isFromCache: false };
  } catch (e: any) {
    // If it's a 401 Unauthorized, we MUST throw it to let the client auto-refresh and logout handle it.
    if (e?.error === 'UNAUTHORIZED' || e?.status === 401) {
      throw e;
    }

    // Otherwise (network offline or server 500), fallback to cache
    const cached = await getCache<ShiftWithAssignment[]>('roster');
    if (cached) {
      return { 
        shifts: cached.data, 
        isFromCache: true, 
        cachedAt: cached.cachedAt 
      };
    }
    
    // No cache and no network
    throw e;
  }
};
