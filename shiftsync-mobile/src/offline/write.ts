/**
 * src/offline/write.ts
 * PURPOSE: The universal write path for all state-changing API calls.
 */
import { newClientUuid } from './idempotency';
import { enqueue } from './outbox';
import { flushOutbox, useSyncStore } from './sync-manager';
import { getIsClockSuspect } from './clock';

export async function offlineWrite(endpoint: string, method: string, payload: any): Promise<string> {
  // 1. Generate Idempotency Key
  const clientUuid = newClientUuid();

  // 2. Attach metadata (clock drift)
  const isSuspect = getIsClockSuspect();
  const enhancedPayload = {
    ...payload,
    clientUuid,
    clockSuspect: isSuspect
  };

  // 3. Write to SQLite outbox (Durable)
  const capturedAt = new Date().toISOString();
  enqueue(clientUuid, endpoint, method, enhancedPayload, capturedAt);
  
  // 4. Update UI Store
  useSyncStore.getState().refreshCounts();

  // 5. Attempt network call in background (non-blocking)
  // We do not wait for this to finish before returning to the caller.
  // The caller updates the UI optimistically immediately.
  setTimeout(() => {
    flushOutbox();
  }, 50);

  return clientUuid;
}
