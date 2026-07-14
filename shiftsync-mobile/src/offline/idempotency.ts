/**
 * src/offline/idempotency.ts
 * PURPOSE: Securely generate v4 UUIDs for idempotency keys.
 */
import uuid from 'react-native-uuid';

export function newClientUuid(): string {
  // UUID v4 guarantees global uniqueness
  return uuid.v4() as string;
}
