/**
 * src/types/index.ts
 * PURPOSE: Core domain models for the ShiftSync application.
 * These types match the architecture specification exactly and are shared across features.
 */

// --- Enums ---

export type Role = 'WORKER' | 'SUPERVISOR' | 'SAFETY' | 'ADMIN';
export type ShiftType = 'DAY' | 'NIGHT' | 'SWING';
export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type AssignmentStatus = 'ASSIGNED' | 'CONFIRMED' | 'SWAP_PENDING' | 'SWAPPED' | 'PRESENT' | 'ABSENT' | 'COMPLETED';
export type AttendanceMethod = 'QR' | 'GPS' | 'MANUAL';
export type RiskLevel = 'LOW' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
export type NotificationType = 'SHIFT_CHANGE' | 'FATIGUE' | 'MUSTER' | 'BROADCAST';
export type MusterResponseStatus = 'PRESENT' | 'UNACCOUNTED';

// --- Interfaces ---

export interface User {
  id: string; // UUID
  email: string;
  phone?: string;
  displayName: string;
  role: Role;
  departmentId?: string; // UUID
  employeeNo: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface Department {
  id: string; // UUID
  name: string;
  mineZone: string;
  supervisorId?: string; // UUID
  createdAt: string; // ISO 8601
}

export interface Certification {
  id: string; // UUID
  name: string;
  description?: string;
  expiryDays: number;
}

export interface Shift {
  id: string; // UUID
  departmentId: string; // UUID
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  shiftType: ShiftType;
  requiredWorkers: number;
  requiredCertId?: string; // UUID
  status: ShiftStatus;
  createdBy: string; // UUID
  publishedAt?: string; // ISO 8601
}

export interface ShiftAssignment {
  id: string; // UUID
  shiftId: string; // UUID
  userId: string; // UUID
  status: AssignmentStatus;
  assignedAt: string; // ISO 8601
  confirmedAt?: string; // ISO 8601
}

export interface SwapRequest {
  id: string; // UUID
  requesterId: string; // UUID
  targetUserId: string; // UUID
  shiftId: string; // UUID
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  resolvedBy?: string; // UUID
  resolvedAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
}

export interface AttendanceRecord {
  id: string; // UUID
  userId: string; // UUID
  shiftId: string; // UUID
  method: AttendanceMethod;
  checkInTime?: string; // ISO 8601
  checkOutTime?: string; // ISO 8601
  checkInLocLat?: number;
  checkInLocLng?: number;
  checkOutLocLat?: number;
  checkOutLocLng?: number;
  deviceId?: string;
  capturedAt: string; // ISO 8601 - when it happened on the device
  syncedAt: string | null; // ISO 8601 - when the server received it
  isOfflineSync: boolean;
  clientUuid: string; // UUID - client generated idempotency key
}

export interface FatigueScore {
  id: string; // UUID
  userId: string; // UUID
  calculatedAt: string; // ISO 8601
  hoursWorked24h: number;
  hoursWorked7d: number;
  nightShifts7d: number;
  consecutiveDays: number;
  selfReportScore?: number; // 1-5
  score: number; // 0-100
  riskLevel: RiskLevel;
  modelVersion: string;
  lastAssessment?: {
    date: string;
    sleepHours: number;
    alertness: number;
  };
  history: { date: string; score: number }[];
}

export interface FatigueAlert {
  id: string; // UUID
  userId: string; // UUID
  scoreId: string; // UUID
  alertLevel: RiskLevel;
  triggeredAt: string; // ISO 8601
  acknowledgedBy?: string; // UUID
  acknowledgedAt?: string; // ISO 8601
  overrideReason?: string;
  resolvedAt?: string; // ISO 8601
}

export interface AppNotification {
  id: string; // UUID
  userId: string; // UUID
  type: NotificationType;
  channel: 'PUSH' | 'SMS';
  title: string;
  message: string;
  payload?: any; // JSON
  sentAt?: string; // ISO 8601
  deliveredAt?: string; // ISO 8601
  acknowledgedAt?: string; // ISO 8601
  escalatedAt?: string; // ISO 8601
}

export interface Muster {
  id: string; // UUID
  initiatedBy: string; // UUID
  zone: string;
  initiatedAt: string; // ISO 8601
  closedAt?: string; // ISO 8601
  closedBy?: string; // UUID
  expectedWorkers: number;
  accountedWorkers: number;
}

export interface MusterResponse {
  id: string; // UUID
  musterId: string; // UUID
  userId: string; // UUID
  status: MusterResponseStatus;
  respondedAt?: string; // ISO 8601
  respondedBy?: string; // UUID
  locLat?: number;
  locLng?: number;
}
