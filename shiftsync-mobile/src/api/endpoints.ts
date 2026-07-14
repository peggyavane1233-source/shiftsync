/**
 * src/api/endpoints.ts
 * PURPOSE: Centralized registry of all API route strings.
 * No route string may appear anywhere else in the codebase.
 */

export const ENDPOINTS = {
  auth: {
    register: '/v1/auth/register',
    login: '/v1/auth/login',
    refresh: '/v1/auth/refresh',
    logout: '/v1/auth/logout',
    passwordReset: '/v1/auth/password/reset',
  },
  shifts: {
    list: '/v1/shifts', // ?from&to&deptId
    listMine: '/v1/shifts/me', // ?from&to
    create: '/v1/shifts',
    update: (id: string) => `/v1/shifts/${id}`,
    publish: (id: string) => `/v1/shifts/${id}/publish`,
    cancel: (id: string) => `/v1/shifts/${id}/cancel`,
    assign: (id: string) => `/v1/shifts/${id}/assignments`,
    confirmAssignment: (id: string) => `/v1/shifts/${id}/confirm`,
    export: '/v1/shifts/export', // ?format=pdf|csv
  },
  swaps: {
    propose: '/v1/swaps',
    approve: (id: string) => `/v1/swaps/${id}/approve`,
  },
  attendance: {
    generateQr: '/v1/attendance/qr/generate',
    checkin: '/v1/attendance/checkin',
    checkout: '/v1/attendance/checkout',
    sync: '/v1/attendance/sync',
    live: '/v1/attendance/live', // ?zone
    mine: '/v1/attendance/me', // ?from&to
  },
  fatigue: {
    me: '/v1/fatigue/me',
    user: (id: string) => `/v1/fatigue/users/${id}`,
    heatmap: '/v1/fatigue/heatmap', // ?deptId&week
    selfReport: '/v1/fatigue/self-report',
    overrideAlert: (id: string) => `/v1/fatigue/alerts/${id}/override`,
    scoreInternal: '/v1/fatigue/score',
  },
  emergency: {
    initiate: '/v1/musters',
    respond: (id: string) => `/v1/musters/${id}/respond`,
    markManual: (id: string) => `/v1/musters/${id}/mark`,
    close: (id: string) => `/v1/musters/${id}/close`,
    liveStream: (id: string) => `/v1/musters/${id}/live`,
  },
} as const;
