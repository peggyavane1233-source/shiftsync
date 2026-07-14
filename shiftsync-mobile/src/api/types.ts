/**
 * src/api/types.ts
 * PURPOSE: Request and response DTOs and standard error envelope.
 */

import { AttendanceMethod } from '../types';

export type RiskLevel = 'LOW' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
export type NotificationType = 'SHIFT_CHANGE' | 'FATIGUE' | 'MUSTER' | 'BROADCAST';



export interface ApiError {
  error: string;
  message: string;
  traceId: string;
  details?: unknown;
}

// --- Auth DTOs ---
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

// --- Attendance DTOs ---
export interface CheckInRequest {
  clientUuid: string;
  shiftId: string;
  method: AttendanceMethod;
  qrToken?: string;
  lat?: number;
  lng?: number;
  capturedAt: string;
  deviceId?: string;
}

export interface CheckOutRequest {
  clientUuid: string;
  shiftId: string;
  method: AttendanceMethod;
  qrToken?: string;
  lat?: number;
  lng?: number;
  capturedAt: string;
  deviceId?: string;
}

export interface SyncRequest {
  records: Array<{
    clientUuid: string;
    endpoint: string;
    payload: string; // JSON string of the request
    capturedAt: string;
  }>;
}

// --- Fatigue DTOs ---
export interface SelfReportRequest {
  sleepHours?: number;
  alertness?: number; // 1-5
}

export interface OverrideAlertRequest {
  reason: string; // >= 20 chars
}

// --- Shift DTOs ---
export interface AssignWorkersRequest {
  userIds: string[];
}

import { Shift, AssignmentStatus } from '../types';

export interface ShiftWithAssignment extends Shift {
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  assignedAt: string;
}

// --- Task DTOs ---
export type TaskStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED';

export interface Task {
  id: string;
  title: string;
  assignedUserId: string;
  assignedByUserId: string;
  status: TaskStatus;
  createdAt: string;
}

export interface CreateTaskRequest {
  title: string;
  assignedUserId: string;
}
