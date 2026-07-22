/**
 * src/api/mock/db.ts
 * PURPOSE: In-memory store holding the seeded mock data.
 * Used synchronously by mock handlers to simulate backend state.
 */

import { generateSeedData } from './seed';

export type FatigueOverride = {
  userId: string;
  reason: string;
  overriddenAt: string;
};

class MockDatabase {
  public data = generateSeedData();
  /** Active supervisor overrides that allow CRITICAL workers to check in. */
  public fatigueOverrides: FatigueOverride[] = [];

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

  hasOverride(userId: string, _shiftId?: string) {
    return this.fatigueOverrides.some(o => o.userId === userId);
  }

  setOverride(userId: string, reason: string) {
    this.fatigueOverrides = this.fatigueOverrides.filter(o => o.userId !== userId);
    this.fatigueOverrides.push({
      userId,
      reason,
      overriddenAt: new Date().toISOString(),
    });
  }

  clearOverride(userId: string) {
    this.fatigueOverrides = this.fatigueOverrides.filter(o => o.userId !== userId);
  }

  getUserCerts(userId: string) {
    return (this.data as any).certAssignments.filter((c: any) => c.userId === userId);
  }
}

export const db = new MockDatabase();
