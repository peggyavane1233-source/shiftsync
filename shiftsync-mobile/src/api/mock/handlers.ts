/**
 * src/api/mock/handlers.ts
 * PURPOSE: Simulate real backend behaviour, including artificial latency,
 * network failures, and complex business rules (e.g. fatigue blocking).
 */

import { db } from './db';
import { ApiError, CheckInRequest } from '../types';
import uuid from 'react-native-uuid';
import { differenceInSeconds } from 'date-fns';

export let MOCK_FAILURE_RATE = 0.0; // 0.0 to 1.0. Set higher to test offline sync

const delay = () => {
  const ms = Math.floor(Math.random() * 250) + 150; // 150 - 400ms
  return new Promise(resolve => setTimeout(resolve, ms));
};

const simulateNetwork = async () => {
  await delay();
  if (Math.random() < MOCK_FAILURE_RATE) {
    throw new Error('Network request failed (Simulated offline)');
  }
};

const createError = (error: string, message: string): ApiError => ({
  error,
  message,
  traceId: uuid.v4() as string,
});

export const mockHandlers = {
  auth: {
    login: async (email: string) => {
      await simulateNetwork();
      const user = db.getUserByEmail(email);
      if (!user) throw createError('UNAUTHORIZED', 'Invalid credentials');
      return { accessToken: 'mock-jwt-token', refreshToken: 'mock-refresh-token' };
    }
  },

  shifts: {
    listMine: async (userId: string) => {
      await simulateNetwork();
      // Returns shifts enriched with the user's assignment data
      const myAssignments = db.data.assignments.filter(a => a.userId === userId);
      return myAssignments.map(assign => {
        const shift = db.getShift(assign.shiftId);
        if (!shift) return null;
        return {
          ...shift,
          assignmentId: assign.id,
          assignmentStatus: assign.status,
          assignedAt: assign.assignedAt,
        };
      }).filter(Boolean);
    },
    listSupervisorShifts: async (userId: string) => {
      await simulateNetwork();
      const user = db.getUser(userId);
      if (!user || !user.departmentId) return [];
      
      return db.data.shifts.filter(s => s.departmentId === user.departmentId).map(shift => {
        const assignments = db.getAssignmentsForShift(shift.id);
        const records = db.data.attendanceRecords.filter(a => a.shiftId === shift.id);
        return {
          ...shift,
          assignments,
          attendance: records,
        };
      });
    },
    confirm: async (assignmentId: string) => {
      await simulateNetwork();
      const assign = db.data.assignments.find(a => a.id === assignmentId);
      if (!assign) throw createError('NOT_FOUND', 'Assignment not found');
      assign.status = 'CONFIRMED';
      return { success: true };
    },
    swap: async (assignmentId: string, reason: string) => {
      await simulateNetwork();
      const assign = db.data.assignments.find(a => a.id === assignmentId);
      if (!assign) throw createError('NOT_FOUND', 'Assignment not found');
      assign.status = 'SWAP_PENDING';
      db.data.swapRequests.push({
        id: uuid.v4() as string,
        requesterId: assign.userId,
        targetUserId: 'temp-target-id', // Mock target, ideally this would come from the API payload
        shiftId: assign.shiftId,
        status: 'PENDING',
        reason,
        createdAt: new Date().toISOString()
      });
      return { success: true };
    },
    approveSwap: async (assignmentId: string, newUserId: string) => {
      await simulateNetwork();
      const assign = db.data.assignments.find(a => a.id === assignmentId);
      if (!assign) throw createError('NOT_FOUND', 'Assignment not found');
      
      const swapReq = db.data.swapRequests.find(s => s.shiftId === assign.shiftId && s.requesterId === assign.userId && s.status === 'PENDING');
      if (swapReq) {
        swapReq.status = 'APPROVED';
        swapReq.targetUserId = newUserId;
      }

      assign.userId = newUserId;
      assign.status = 'CONFIRMED';
      assign.assignedAt = new Date().toISOString();
      return { success: true };
    },
    unassign: async (assignmentId: string) => {
      await simulateNetwork();
      const idx = db.data.assignments.findIndex(a => a.id === assignmentId);
      if (idx === -1) throw createError('NOT_FOUND', 'Assignment not found');
      db.data.assignments.splice(idx, 1);
      return { success: true };
    },
    availableWorkers: async (shiftId: string) => {
      await simulateNetwork();
      const shift = db.getShift(shiftId);
      if (!shift) throw createError('NOT_FOUND', 'Shift not found');
      
      const deptWorkers = db.data.users.filter(u => u.departmentId === shift.departmentId && u.role === 'WORKER');
      const shiftStart = new Date(shift.startTime).getTime();
      const shiftEnd = new Date(shift.endTime).getTime();

      return deptWorkers.filter(worker => {
        // Find if this worker has any overlapping assignment
        const userAssignments = db.data.assignments.filter(a => a.userId === worker.id);
        const hasConflict = userAssignments.some(assign => {
          const s = db.getShift(assign.shiftId);
          if (!s) return false;
          const sStart = new Date(s.startTime).getTime();
          const sEnd = new Date(s.endTime).getTime();
          return shiftStart < sEnd && shiftEnd > sStart;
        });
        return !hasConflict;
      });
    },
    create: async (shiftData: { departmentId: string, startTime: string, endTime: string, shiftType: 'DAY' | 'NIGHT', requiredWorkers: number }, userId: string) => {
      await simulateNetwork();
      const newShift = {
        id: uuid.v4() as string,
        departmentId: shiftData.departmentId,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        shiftType: shiftData.shiftType,
        requiredWorkers: shiftData.requiredWorkers,
        status: 'PUBLISHED',
        createdBy: userId,
        publishedAt: new Date().toISOString()
      };
      // @ts-ignore
      db.data.shifts.push(newShift);
      return newShift;
    },
    cancel: async (shiftId: string) => {
      await simulateNetwork();
      // Remove shift
      (db.data as any).shifts = (db.data as any).shifts.filter((s: any) => s.id !== shiftId);
      // Remove associated assignments
      (db.data as any).assignments = (db.data as any).assignments.filter((a: any) => a.shiftId !== shiftId);
      return { success: true };
    },
    assign: async (shiftId: string, userIds: string[]) => {
      await simulateNetwork();
      const shift = db.getShift(shiftId);
      if (!shift) throw createError('NOT_FOUND', 'Shift not found');

      for (const userId of userIds) {
        // Overlap Check (simplified: checks if user is on any other shift overlapping)
        const userAssignments = db.data.assignments.filter(a => a.userId === userId);
        const shiftStart = new Date(shift.startTime).getTime();
        const shiftEnd = new Date(shift.endTime).getTime();

        for (const assign of userAssignments) {
          const s = db.getShift(assign.shiftId);
          if (!s) continue;
          const sStart = new Date(s.startTime).getTime();
          const sEnd = new Date(s.endTime).getTime();
          
          if (shiftStart < sEnd && shiftEnd > sStart && s.id !== shiftId) {
            throw createError('SHIFT_CONFLICT', `Worker is already assigned to overlapping shift ${s.id}`);
          }
        }
        
        // Certification Check
        if (shift.requiredCertId) {
          // For mock, assume missing cert randomly if they try to assign
          throw createError('CERT_MISSING', 'Worker lacks the required certification');
        }
        
        // Add Assignment
        db.data.assignments.push({
          id: uuid.v4() as string,
          shiftId,
          userId,
          status: 'ASSIGNED',
          assignedAt: new Date().toISOString()
        });
      }
      return { success: true };
    }
  },

  attendance: {
    checkin: async (req: CheckInRequest, userId: string) => {
      await simulateNetwork();
      
      // 1. Validate QR Token (Mock format: "shiftId|timestamp")
      if (req.method === 'QR' && req.qrToken) {
        const [tokenShiftId, timestampStr] = req.qrToken.split('|');
        if (!timestampStr) {
           // Provide a graceful fallback for fake tokens in dev
           console.warn("Invalid token format, bypassing QR expiry for mock.");
        } else {
           const tokenTime = new Date(timestampStr);
           const ageSeconds = differenceInSeconds(new Date(), tokenTime);
           if (ageSeconds > 90) {
             throw createError('QR_EXPIRED', 'Code expired. Ask supervisor to refresh.');
           }
           if (tokenShiftId !== req.shiftId) {
             throw createError('INVALID_QR', 'QR code does not match the shift.');
           }
        }
      }

      // 2. Assignment Check
      const assignment = db.getAssignment(userId, req.shiftId);
      if (!assignment || !['ASSIGNED', 'CONFIRMED'].includes(assignment.status)) {
        throw createError('FORBIDDEN', 'User is not assigned to this shift.');
      }

      // 3. Fatigue Check
      const score = db.getFatigueScore(userId);
      if (score && score.riskLevel === 'CRITICAL') {
        const hasOverride = db.hasOverride(userId, req.shiftId);
        if (!hasOverride) {
          throw createError('FATIGUE_CRITICAL', `Worker fatigue score ${score.score} (CRITICAL). Supervisor override required.`);
        }
      }

      // 4. Idempotency Check & Insert
      const existing = db.data.attendanceRecords.find(a => a.clientUuid === req.clientUuid);
      if (existing) {
        return existing; // Idempotent success
      }

      const newRecord = {
        id: uuid.v4() as string,
        userId,
        shiftId: req.shiftId,
        method: req.method,
        checkInTime: new Date().toISOString(),
        capturedAt: req.capturedAt,
        syncedAt: new Date().toISOString(),
        isOfflineSync: false,
        clientUuid: req.clientUuid,
        deviceId: req.deviceId,
        checkInLocLat: req.lat,
        checkInLocLng: req.lng
      };

      db.data.attendanceRecords.push(newRecord);
      
      // Update assignment
      assignment.status = 'PRESENT';

      return newRecord;
    },
    checkout: async (req: import('../types').CheckOutRequest, userId: string) => {
      await simulateNetwork();
      
      const record = db.data.attendanceRecords.find(a => a.shiftId === req.shiftId && a.userId === userId && !a.checkOutTime);
      if (!record) {
         // Idempotency Check
         const existing = db.data.attendanceRecords.find(a => a.clientUuid === req.clientUuid);
         if (existing) return existing;
         throw createError('NOT_FOUND', 'No active check-in found for this shift.');
      }

      record.checkOutTime = new Date().toISOString();
      record.checkOutLocLat = req.lat;
      record.checkOutLocLng = req.lng;
      
      const assignment = db.getAssignment(userId, req.shiftId);
      if (assignment) assignment.status = 'COMPLETED';

      // Update fatigue mock (simulate worked hours)
      const fatigue = db.getFatigueScore(userId);
      if (fatigue) {
         fatigue.hoursWorked24h += 8; // mock 8 hours
         fatigue.hoursWorked7d += 8;
         fatigue.consecutiveDays += 1;
         fatigue.score = Math.min(100, fatigue.score + 20);
         if (fatigue.score >= 80) fatigue.riskLevel = 'CRITICAL';
         else if (fatigue.score >= 60) fatigue.riskLevel = 'WARNING';
         else if (fatigue.score >= 40) fatigue.riskLevel = 'ADVISORY';
         else fatigue.riskLevel = 'LOW';
         if (fatigue.riskLevel !== 'CRITICAL') db.clearOverride(userId);
      }

      return record;
    },
    mine: async (userId: string) => {
      await simulateNetwork();
      return db.data.attendanceRecords.filter(a => a.userId === userId).sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    },
    headcount: async (shiftId: string) => {
      // Simulate WebSocket speed or fast polling
      // No artificial delay here for F7 real-time feel
      const assignments = db.getAssignmentsForShift(shiftId);
      const records = db.data.attendanceRecords.filter(a => a.shiftId === shiftId && !a.checkOutTime);
      
      const present = records.length;
      const expected = assignments.length;
      const missing = expected - present;

      return { present, expected, missing, records, assignments };
    },
    markManual: async (shiftId: string, workerId: string) => {
      await simulateNetwork();
      const assignment = db.getAssignment(workerId, shiftId);
      if (!assignment) throw createError('NOT_FOUND', 'Worker not assigned to this shift');
      
      const existing = db.data.attendanceRecords.find(a => a.shiftId === shiftId && a.userId === workerId && !a.checkOutTime);
      if (existing) return existing;

      const newRecord = {
        id: uuid.v4() as string,
        userId: workerId,
        shiftId,
        method: 'MANUAL' as any,
        checkInTime: new Date().toISOString(),
        capturedAt: new Date().toISOString(),
        syncedAt: new Date().toISOString(),
        isOfflineSync: false,
        clientUuid: uuid.v4() as string,
      };

      db.data.attendanceRecords.push(newRecord);
      assignment.status = 'PRESENT';
      return newRecord;
    }
  },
  fatigue: {
    me: async (userId: string) => {
      await simulateNetwork();
      let f = db.getFatigueScore(userId);
      if (!f) {
        f = {
          id: uuid.v4() as string,
          userId,
          calculatedAt: new Date().toISOString(),
          hoursWorked24h: 8,
          hoursWorked7d: 40,
          nightShifts7d: 0,
          consecutiveDays: 3,
          score: 35,
          riskLevel: 'LOW',
          modelVersion: 'FAID-mock-v1',
          history: [{ date: new Date().toISOString(), score: 35 }],
        };
        db.data.fatigueScores.push(f);
      }
      return {
        ...f,
        nightShifts: f.nightShifts7d, // UI alias
        hasOverride: db.hasOverride(userId),
      };
    },
    selfReport: async (req: any, userId: string) => {
      await simulateNetwork();
      let f = db.getFatigueScore(userId);
      if (!f) {
        f = {
          id: uuid.v4() as string,
          userId,
          calculatedAt: new Date().toISOString(),
          hoursWorked24h: 8,
          hoursWorked7d: 40,
          nightShifts7d: 0,
          consecutiveDays: 3,
          score: 40,
          riskLevel: 'ADVISORY',
          modelVersion: 'FAID-mock-v1',
          history: [],
        };
        db.data.fatigueScores.push(f);
      }

      f.lastAssessment = {
        date: new Date().toISOString(),
        sleepHours: req.sleepHours,
        alertness: req.alertness,
      };
      f.selfReportScore = req.alertness;
      f.calculatedAt = new Date().toISOString();

      // Dynamically calculate new score based on self-report
      let newScore = 20 + Math.min(30, f.hoursWorked24h * 2);

      // Sleep penalty
      if (req.sleepHours < 5) newScore += 40;
      else if (req.sleepHours < 6) newScore += 20;
      else if (req.sleepHours < 7) newScore += 10;
      else if (req.sleepHours > 9) newScore += 5; // Oversleep grogginess

      // Alertness penalty
      if (req.alertness === 1) newScore += 40;
      else if (req.alertness === 2) newScore += 20;
      else if (req.alertness === 3) newScore += 10;

      // Historical compounding
      newScore += f.consecutiveDays * 2;
      newScore += f.nightShifts7d * 5;

      f.score = Math.min(100, Math.round(newScore));

      if (f.score >= 80) f.riskLevel = 'CRITICAL';
      else if (f.score >= 60) f.riskLevel = 'WARNING';
      else if (f.score >= 40) f.riskLevel = 'ADVISORY';
      else f.riskLevel = 'LOW';

      if (f.riskLevel !== 'CRITICAL') db.clearOverride(userId);

      if (!f.history) f.history = [];
      if (f.history.length === 0) {
        f.history.push({ date: new Date().toISOString(), score: f.score });
      } else {
        f.history[f.history.length - 1]!.score = f.score;
        f.history[f.history.length - 1]!.date = new Date().toISOString();
      }

      return {
        ...f,
        nightShifts: f.nightShifts7d,
        hasOverride: db.hasOverride(userId),
      };
    },
    listAlerts: async () => {
      await simulateNetwork();
      // Open blocks: CRITICAL without an active supervisor override
      return db.data.fatigueScores
        .filter(f => f.riskLevel === 'CRITICAL' && !db.hasOverride(f.userId))
        .sort((a, b) => b.score - a.score)
        .map(f => {
          const user = db.getUser(f.userId);
          return {
            ...f,
            nightShifts: f.nightShifts7d,
            workerName: user?.displayName || `Worker ${f.userId.slice(-4)}`,
            employeeNo: user?.employeeNo,
          };
        });
    },
    overrideAlert: async (userId: string, reason: string) => {
      await simulateNetwork();
      if (reason.length < 20) throw createError('VALIDATION', 'Reason must be at least 20 chars');

      const score = db.getFatigueScore(userId);
      if (!score) throw createError('NOT_FOUND', 'No fatigue score for this worker');

      db.setOverride(userId, reason);
      // Keep CRITICAL score for audit/display, but check-in is allowed via hasOverride
      return { success: true, userId, riskLevel: score.riskLevel, score: score.score };
    },
    heatmap: async () => {
      await simulateNetwork();
      const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const workers = db.data.users
        .filter(u => u.role === 'WORKER')
        .slice(0, 8)
        .map(u => {
          const f = db.getFatigueScore(u.id);
          const hist = f?.history?.slice(-7) || [];
          // Pad to 7 days if history is shorter
          const scores = Array.from({ length: 7 }, (_, i) => {
            const point = hist[i] || hist[hist.length - 1];
            return point ? point.score : (f?.score ?? 20);
          });
          return {
            id: u.id,
            name: u.displayName,
            employeeNo: u.employeeNo,
            scores,
            riskLevel: f?.riskLevel || 'LOW',
          };
        });

      return { days: dayLabels, workers };
    },
  },
  notifications: {
    me: async (userId: string) => {
      await simulateNetwork();
      return db.data.notifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
    },
    confirm: async (id: string, userId: string) => {
      await simulateNetwork();
      const n = db.data.notifications.find(n => n.id === id && n.userId === userId);
      if (n) {
        n.acknowledgedAt = new Date().toISOString();
      }
      return n;
    }
  },
  muster: {
    initiate: async (zone: string, userId: string) => {
      await simulateNetwork();
      const newMuster = {
        id: uuid.v4() as string,
        initiatedBy: userId,
        zone,
        initiatedAt: new Date().toISOString(),
        expectedWorkers: 50, // Mock number
        accountedWorkers: 0,
      };
      db.data.musters.push(newMuster);
      return newMuster;
    },
    status: async (musterId: string) => {
      // Fast poll
      let muster = db.data.musters.find(m => m.id === musterId);
      if (musterId === 'view') {
        muster = db.data.musters.find(m => !m.closedAt) || db.data.musters[0];
      }
      if (!muster) throw createError('NOT_FOUND', 'Muster not found');
      
      const responses = db.data.musterResponses.filter(r => r.musterId === muster!.id);
      muster.accountedWorkers = responses.length;
      
      // Get unaccounted (all workers in department minus responses)
      // Mock: just return a fake list
      const unaccounted = db.data.users
        .filter(u => u.role === 'WORKER' && !responses.some(r => r.userId === u.id))
        .slice(0, muster.expectedWorkers - muster.accountedWorkers);

      return { muster, unaccounted };
    },
    markPresent: async (musterId: string, workerId: string) => {
      await simulateNetwork();
      db.data.musterResponses.push({
        id: uuid.v4() as string,
        musterId,
        userId: workerId,
        status: 'PRESENT',
        respondedAt: new Date().toISOString()
      });
      return { success: true };
    },
    close: async (musterId: string, userId: string) => {
      await simulateNetwork();
      const muster = db.data.musters.find(m => m.id === musterId);
      if (muster) {
        muster.closedAt = new Date().toISOString();
        muster.closedBy = userId;
      }
      return muster;
    }
  },
  users: {
    myCerts: async (userId: string) => {
      await simulateNetwork();
      return db.getUserCerts(userId);
    },
    list: async () => {
      await simulateNetwork();
      return db.data.users;
    },
    create: async (userData: any) => {
      await simulateNetwork();
      const newUser = {
        id: uuid.v4() as string,
        ...userData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.data.users.push(newUser as any);
      return newUser;
    }
  },
  tasks: {
    create: async (req: any, supervisorId: string) => {
      await simulateNetwork();
      const newTask = {
        id: uuid.v4() as string,
        ...req,
        assignedByUserId: supervisorId,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      // Use a runtime extension for the mock DB to avoid strict type edits
      (db.data as any).tasks = (db.data as any).tasks || [];
      (db.data as any).tasks.push(newTask);
      return newTask;
    },
    mine: async (userId: string) => {
      await simulateNetwork();
      return ((db.data as any).tasks || []).filter((t: any) => t.assignedUserId === userId && t.status !== 'COMPLETED');
    },
    acknowledge: async (taskId: string) => {
      await simulateNetwork();
      const t = ((db.data as any).tasks || []).find((t: any) => t.id === taskId);
      if (t) t.status = 'ACKNOWLEDGED';
      return t;
    }
  }
};
