/**
 * src/offline/outbox.ts
 * PURPOSE: Manage the durable queue of outbound API requests.
 */
import { db } from './db';

export interface OutboxItem {
  client_uuid: string;
  endpoint: string;
  method: string;
  payload: string;
  captured_at: string;
  attempts: number;
  last_error: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED';
}

export function enqueue(clientUuid: string, endpoint: string, method: string, payload: any, capturedAt: string): string {
  db.runSync(
    'INSERT INTO outbox (client_uuid, endpoint, method, payload, captured_at) VALUES (?, ?, ?, ?, ?)',
    [clientUuid, endpoint, method, JSON.stringify(payload), capturedAt]
  );
  return clientUuid;
}

export function getPending(): OutboxItem[] {
  // We fetch up to 200 items, ordered strictly by captured_at ASC to preserve operational order.
  return db.getAllSync<OutboxItem>(
    'SELECT * FROM outbox WHERE status = ? ORDER BY captured_at ASC LIMIT 200',
    ['PENDING']
  );
}

export function getFailed(): OutboxItem[] {
  return db.getAllSync<OutboxItem>(
    'SELECT * FROM outbox WHERE status = ?',
    ['FAILED']
  );
}

export function markSent(clientUuid: string) {
  db.runSync('UPDATE outbox SET status = ? WHERE client_uuid = ?', ['SENT', clientUuid]);
}

export function markFailed(clientUuid: string, errorMsg: string, attempts: number) {
  // If we've failed 10 times, we mark it officially FAILED so it stops retrying and is surfaced to the user.
  const newStatus = attempts >= 10 ? 'FAILED' : 'PENDING';
  db.runSync(
    'UPDATE outbox SET status = ?, last_error = ?, attempts = ? WHERE client_uuid = ?',
    [newStatus, errorMsg, attempts, clientUuid]
  );
}

export function clearQueueForTest() {
  db.runSync('DELETE FROM outbox');
}
