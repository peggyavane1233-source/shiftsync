/**
 * src/api/mock/db.ts
 * PURPOSE: In-memory store holding the seeded mock data.
 * Used synchronously by mock handlers to simulate backend state.
 */

import { generateSeedData } from './seed';

class MockDatabase {
  public data = generateSeedData();

  // Helper methods to query the mock DB
  getUser(id: string) {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string) {
    return this.data.users.find(u => u.email === email);
  }

  getFatigueScore(userId: string) {
    return this.data.fatigueScores.find(f => f.userId === userId);
  }

  getShift(shiftId: string) {
    return this.data.shifts.find(s => s.id === shiftId);
  }

  getAssignmentsForShift(shiftId: string) {
    return this.data.assignments.filter(a => a.shiftId === shiftId);
  }

  getAssignment(userId: string, shiftId: string) {
    return this.data.assignments.find(a => a.userId === userId && a.shiftId === shiftId);
  }

  hasOverride(userId: string, shiftId: string) {
    // In a real system, alerts and overrides are linked. 
    // For the mock, we'll assume no overrides exist initially.
    return false;
  }

  getUserCerts(userId: string) {
    return (this.data as any).certAssignments.filter((c: any) => c.userId === userId);
  }
}

export const db = new MockDatabase();
