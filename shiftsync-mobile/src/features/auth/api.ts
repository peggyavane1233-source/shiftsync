/**
 * src/features/auth/api.ts
 * PURPOSE: Abstract the login network calls away from the components.
 */
import { apiClient } from '../../api/client';
import { LoginResponse } from './types';

export const authApi = {
  loginWithEmail: async (email: string, password?: string): Promise<LoginResponse> => {
    // Note: The mock API currently only accepts email. The real API would take password.
    const res = await apiClient.auth.login(email);
    // The mock currently doesn't return the full user, so we fake it by querying the mock DB directly
    // since we control the mock environment. In reality, the server returns the user profile.
    if (!res.accessToken) throw new Error('Invalid login response');
    
    // Quick hack for demo mock sync
    let userMock = null;
    try {
       const { db } = await import('../../api/mock/db');
       userMock = db.getUserByEmail(email);
    } catch (e) {}

    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken || 'mock-refresh-token',
      user: userMock as any
    };
  },
  
  refreshSession: async (refreshToken: string): Promise<LoginResponse> => {
    // Real API would exchange refreshToken for a new pair.
    // For now we simulate success or failure based on the token.
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!refreshToken) reject(new Error('Invalid refresh token'));
        else resolve({
          accessToken: 'refreshed-jwt-token',
          refreshToken: 'new-refresh-token',
          // Since it's a mock we'll just pick the first user
          user: require('../../api/mock/db').db.data.users[0]
        });
      }, 300);
    });
  }
};
