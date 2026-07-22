/**
 * src/api/client.ts
 * PURPOSE: The ONLY place the app talks to a server. 
 * Fetches are routed through here to attach JWTs and handle common errors.
 * Flips between Mock and Real using USE_MOCK_API in src/api/mode.ts (code only).
 */

import { mockHandlers } from './mock/handlers';
import { ENDPOINTS } from './endpoints';
import { CheckInRequest } from './types';
import { getUseMockApi } from './mode';

export { getUseMockApi, USE_MOCK_API } from './mode';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

// Mock session context (In a real app, this comes from a secure store / zustand)
let currentToken: string | null = null;
let currentUserId: string = 'usr-wrk-0000-0000-0000-000000000001'; // Default to first worker for mock

export const setMockUser = (userId: string) => { currentUserId = userId; };
export const setAuthToken = (token: string) => { currentToken = token; };

// Base fetch wrapper
async function apiFetch<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !isRetry) {
      try {
        const { useAuthStore } = await import('../features/auth/store');
        await useAuthStore.getState().restoreSession();
        // Since restoreSession updates the currentToken via setAuthToken, we retry:
        if (currentToken) {
           return apiFetch<T>(endpoint, options, true);
        }
      } catch (e) {
        // If refresh fails, restoreSession already clears the session
      }
    }

    const errorData = await response.json().catch(() => null);
    throw errorData || new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Client Interface
export const apiClient = {
  auth: {
    login: async (email: string, password?: string) => {
      if (getUseMockApi()) return mockHandlers.auth.login(email, password);
      return apiFetch<{ accessToken: string; refreshToken: string }>(ENDPOINTS.auth.login, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    }
  },
  shifts: {
    listMine: async () => {
      if (getUseMockApi()) return mockHandlers.shifts.listMine(currentUserId);
      return apiFetch<any>(ENDPOINTS.shifts.listMine);
    },
    assign: async (shiftId: string, userIds: string[]) => {
      if (getUseMockApi()) return mockHandlers.shifts.assign(shiftId, userIds);
      return apiFetch<any>(ENDPOINTS.shifts.assign(shiftId), {
        method: 'POST',
        body: JSON.stringify({ userIds })
      });
    },
    confirm: async (assignmentId: string) => {
      if (getUseMockApi()) return mockHandlers.shifts.confirm(assignmentId);
      return apiFetch<any>(ENDPOINTS.shifts.confirmAssignment(assignmentId), { method: 'POST' });
    },
    swap: async (assignmentId: string, reason: string) => {
      if (getUseMockApi()) return mockHandlers.shifts.swap(assignmentId, reason);
      return apiFetch<any>(ENDPOINTS.swaps.propose, { 
        method: 'POST',
        body: JSON.stringify({ assignmentId, reason })
      });
    },
    approveSwap: async (assignmentId: string, newUserId: string) => {
      if (getUseMockApi()) return mockHandlers.shifts.approveSwap(assignmentId, newUserId);
      return apiFetch<any>(`/v1/swaps/${assignmentId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ newUserId })
      });
    },
    rejectSwap: async (assignmentId: string) => {
      if (getUseMockApi()) return mockHandlers.shifts.rejectSwap(assignmentId);
      return apiFetch<any>(`/v1/swaps/${assignmentId}/reject`, { method: 'POST' });
    },
    unassign: async (assignmentId: string) => {
      if (getUseMockApi()) return mockHandlers.shifts.unassign(assignmentId);
      return apiFetch<any>(`/v1/assignments/${assignmentId}`, { method: 'DELETE' });
    },
    availableWorkers: async (shiftId: string) => {
      if (getUseMockApi()) return mockHandlers.shifts.availableWorkers(shiftId);
      return apiFetch<any[]>(`/v1/shifts/${shiftId}/available-workers`);
    },
    create: async (shiftData: { departmentId: string, startTime: string, endTime: string, shiftType: 'DAY' | 'NIGHT', requiredWorkers: number, status?: string }) => {
      if (getUseMockApi()) return mockHandlers.shifts.create(shiftData as any, currentUserId);
      return apiFetch<any>('/v1/shifts', {
        method: 'POST',
        body: JSON.stringify(shiftData)
      });
    },
    cancel: async (shiftId: string) => {
      if (getUseMockApi()) return mockHandlers.shifts.cancel(shiftId);
      return apiFetch<any>(`/v1/shifts/${shiftId}`, { method: 'DELETE' });
    }
  },
  attendance: {
    checkin: async (req: CheckInRequest) => {
      if (getUseMockApi()) return mockHandlers.attendance.checkin(req, currentUserId);
      return apiFetch<any>(ENDPOINTS.attendance.checkin, {
        method: 'POST',
        body: JSON.stringify(req)
      });
    },
    checkout: async (req: import('./types').CheckOutRequest) => {
      if (getUseMockApi()) return mockHandlers.attendance.checkout(req, currentUserId);
      return apiFetch<any>(ENDPOINTS.attendance.checkout, {
        method: 'POST',
        body: JSON.stringify(req)
      });
    },
    mine: async () => {
      if (getUseMockApi()) return mockHandlers.attendance.mine(currentUserId);
      return apiFetch<any>(ENDPOINTS.attendance.mine);
    }
  },
  fatigue: {
    me: async () => {
      if (getUseMockApi()) return mockHandlers.fatigue.me(currentUserId);
      return apiFetch<any>(ENDPOINTS.fatigue.me);
    },
    selfReport: async (req: { sleepHours: number; alertness: number }) => {
      if (getUseMockApi()) return mockHandlers.fatigue.selfReport(req, currentUserId);
      return apiFetch<any>(ENDPOINTS.fatigue.selfReport, {
        method: 'POST',
        body: JSON.stringify(req)
      });
    },
    heatmap: async () => {
      if (getUseMockApi()) return mockHandlers.fatigue.heatmap();
      return apiFetch<any>(ENDPOINTS.fatigue.heatmap);
    },
    requestOverride: async () => {
      if (getUseMockApi()) return mockHandlers.fatigue.requestOverride(currentUserId);
      return apiFetch<any>('/v1/fatigue/me/request-override', { method: 'POST' });
    }
  },
  notifications: {
    me: async () => {
      if (getUseMockApi()) return mockHandlers.notifications.me(currentUserId);
      return apiFetch<import('../types').AppNotification[]>('/v1/notifications');
    },
    confirm: async (id: string) => {
      if (getUseMockApi()) return mockHandlers.notifications.confirm(id, currentUserId);
      return apiFetch<any>(`/v1/notifications/${id}/confirm`, { method: 'POST' });
    }
  },
  supervisor: {
    listShifts: async () => {
      if (getUseMockApi()) return mockHandlers.shifts.listSupervisorShifts(currentUserId);
      return apiFetch<any>('/v1/supervisor/shifts');
    },
    headcount: async (shiftId: string) => {
      if (getUseMockApi()) return mockHandlers.attendance.headcount(shiftId);
      return apiFetch<any>(`/v1/attendance/shifts/${shiftId}/headcount`);
    },
    markManual: async (shiftId: string, workerId: string) => {
      if (getUseMockApi()) return mockHandlers.attendance.markManual(shiftId, workerId);
      return apiFetch<any>(`/v1/attendance/shifts/${shiftId}/manual`, {
        method: 'POST', body: JSON.stringify({ workerId })
      });
    },
    listFatigueAlerts: async () => {
      if (getUseMockApi()) return mockHandlers.fatigue.listAlerts();
      return apiFetch<any>('/v1/supervisor/fatigue-alerts');
    },
    overrideFatigue: async (userId: string, reason: string) => {
      if (getUseMockApi()) return mockHandlers.fatigue.overrideAlert(userId, reason);
      return apiFetch<any>(`/v1/fatigue/${userId}/override`, {
        method: 'POST', body: JSON.stringify({ reason })
      });
    }
  },
  muster: {
    initiate: async (zone: string) => {
      if (getUseMockApi()) return mockHandlers.muster.initiate(zone, currentUserId);
      // Backend InitiateRequest expects { zone: UUID }
      return apiFetch<any>('/v1/musters', { method: 'POST', body: JSON.stringify({ zone }) });
    },
    status: async (musterId: string) => {
      if (getUseMockApi()) return mockHandlers.muster.status(musterId);
      // Backend GET /v1/musters/{id} returns EmergencyMuster only.
      // Until a /status endpoint is added, we return the flat entity.
      return apiFetch<any>(`/v1/musters/${musterId}`);
    },
    markPresent: async (musterId: string, workerId: string) => {
      if (getUseMockApi()) return mockHandlers.muster.markPresent(musterId, workerId);
      // Backend expects { userId } not { workerId }
      return apiFetch<any>(`/v1/musters/${musterId}/present`, { method: 'POST', body: JSON.stringify({ userId: workerId }) });
    },
    close: async (musterId: string) => {
      if (getUseMockApi()) return mockHandlers.muster.close(musterId, currentUserId);
      return apiFetch<any>(`/v1/musters/${musterId}/close`, { method: 'POST' });
    }
  },
  tasks: {
    create: async (req: import('./types').CreateTaskRequest) => {
      if (getUseMockApi()) return mockHandlers.tasks.create(req, currentUserId);
      return apiFetch<import('./types').Task>('/v1/tasks', { method: 'POST', body: JSON.stringify(req) });
    },
    mine: async () => {
      if (getUseMockApi()) return mockHandlers.tasks.mine(currentUserId);
      return apiFetch<import('./types').Task[]>('/v1/tasks/mine');
    },
    acknowledge: async (taskId: string) => {
      if (getUseMockApi()) return mockHandlers.tasks.acknowledge(taskId);
      return apiFetch<any>(`/v1/tasks/${taskId}/acknowledge`, { method: 'POST' });
    }
  },
  users: {
    myCerts: async () => {
      if (getUseMockApi()) return mockHandlers.users.myCerts(currentUserId);
      return apiFetch<any[]>('/v1/users/me/certs');
    },
    list: async () => {
      if (getUseMockApi()) return mockHandlers.users.list();
      return apiFetch<any[]>('/v1/users');
    },
    create: async (userData: any) => {
      if (getUseMockApi()) return mockHandlers.users.create(userData);
      return apiFetch<any>('/v1/users', { method: 'POST', body: JSON.stringify(userData) });
    },
    registerDevice: async (token: string) => {
      if (getUseMockApi()) return;
      return apiFetch<any>('/v1/users/me/devices', {
        method: 'POST',
        body: JSON.stringify({ token, platform: 'expo' })
      });
    }
  },
  admin: {
    listRosterShifts: async () => {
      if (getUseMockApi()) return mockHandlers.shifts.listAll();
      return apiFetch<any[]>('/v1/shifts');
    },
    publishRoster: async () => {
      if (getUseMockApi()) return mockHandlers.shifts.publishDrafts();
      return apiFetch<any>('/v1/shifts/publish', { method: 'POST' });
    },
    zoneSummary: async () => {
      if (getUseMockApi()) return mockHandlers.admin.zoneSummary();
      return apiFetch<any[]>('/v1/admin/zones/summary');
    },
    reports: async () => {
      if (getUseMockApi()) return mockHandlers.admin.reports();
      return apiFetch<any>('/v1/admin/reports');
    }
  }
};
