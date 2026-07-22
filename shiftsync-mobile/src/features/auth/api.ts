/**
 * src/features/auth/api.ts
 * PURPOSE: Abstract the login network calls away from the components.
 */
import { apiClient, getUseMockApi, setMockUser } from '../../api/client';
import { LoginResponse, User } from './types';
import { jwtDecode } from 'jwt-decode';

function userFromJwt(accessToken: string, fallbackEmail = ''): User {
  const decoded = jwtDecode<Record<string, string>>(accessToken);
  const now = new Date().toISOString();
  return {
    id: decoded.sub || decoded.id || '',
    email: decoded.email || fallbackEmail,
    displayName: decoded.name || decoded.displayName || 'User',
    role: (decoded.role as User['role']) || 'WORKER',
    departmentId: decoded.deptId || decoded.departmentId,
    employeeNo: decoded.employeeNo || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function userFromMockLogin(email: string): Promise<User> {
  const { db } = await import('../../api/mock/db');
  const u = db.getUserByEmail(email);
  if (!u) throw new Error('Invalid credentials');
  setMockUser(u.id);
  return u;
}

export const authApi = {
  loginWithEmail: async (email: string, password?: string): Promise<LoginResponse> => {
    const res = await apiClient.auth.login(email, password);
    if (!res.accessToken) throw new Error('Invalid login response');

    if (getUseMockApi() || res.accessToken === 'mock-jwt-token') {
      return {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: await userFromMockLogin(email),
      };
    }

    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: userFromJwt(res.accessToken, email),
    };
  },

  refreshSession: async (refreshToken: string): Promise<LoginResponse> => {
    if (getUseMockApi() || refreshToken === 'mock-refresh-token') {
      throw new Error('Refresh failed');
    }

    const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const res = await response.json();
    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: userFromJwt(res.accessToken),
    };
  },
};
