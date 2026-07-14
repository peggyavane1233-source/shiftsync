/**
 * src/features/auth/api.ts
 * PURPOSE: Abstract the login network calls away from the components.
 */
import { apiClient } from '../../api/client';
import { LoginResponse, User } from './types';
import { jwtDecode } from 'jwt-decode';

export const authApi = {
  loginWithEmail: async (email: string, password?: string): Promise<LoginResponse> => {
    // Call the real API which requires email (and potentially password)
    const res = await apiClient.auth.login(email);
    if (!res.accessToken) throw new Error('Invalid login response');
    
    // Parse the JWT to get user info
    let user: User | null = null;
    try {
       const decoded = jwtDecode<any>(res.accessToken);
       // Transform decoded JWT into our User type based on token claims
       user = {
         id: decoded.sub || decoded.id,
         name: decoded.name || 'User',
         email: decoded.email || email,
         role: decoded.role || 'WORKER',
         departmentId: decoded.departmentId || 'dept-1'
       } as User;
    } catch (e) {
       console.error("Failed to parse JWT", e);
    }

    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: user as any
    };
  },
  
  refreshSession: async (refreshToken: string): Promise<LoginResponse> => {
    // Note: apiClient.auth.refresh is not defined in client.ts yet, so let's use global fetch
    // to avoid circular dependencies with apiClient interceptors
    const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const res = await response.json();
    
    let user: User | null = null;
    try {
       const decoded = jwtDecode<any>(res.accessToken);
       user = {
         id: decoded.sub || decoded.id,
         name: decoded.name || 'User',
         email: decoded.email || '',
         role: decoded.role || 'WORKER',
         departmentId: decoded.departmentId || 'dept-1'
       } as User;
    } catch (e) {
       console.error("Failed to parse JWT", e);
    }

    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      user: user as any
    };
  }
};
