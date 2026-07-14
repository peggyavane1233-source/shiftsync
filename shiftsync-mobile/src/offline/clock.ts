/**
 * src/offline/clock.ts
 * PURPOSE: Monitor clock drift between the local device and the server.
 */
import { useSyncStore } from './sync-manager';

export function updateClockDrift(serverDateString: string | null) {
  if (!serverDateString) return;
  
  const serverTime = new Date(serverDateString).getTime();
  const localTime = Date.now();
  const driftMs = Math.abs(localTime - serverTime);
  
  // 10 minutes drift tolerance
  const isSuspect = driftMs > 10 * 60 * 1000;
  
  useSyncStore.getState().setClockSuspect(isSuspect);
}

export function getIsClockSuspect(): boolean {
  return useSyncStore.getState().clockSuspect;
}
