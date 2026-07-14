/**
 * src/features/auth/store.ts
 * PURPOSE: Global state management for authentication. 
 * Securely interacts with expo-secure-store for the refreshToken.
 */
import { create } from 'zustand';
import { tokenStorage } from './tokenStorage';
import { AuthState } from './types';
import { authApi } from './api';
import { setAuthToken, setMockUser } from '../../api/client';

const REFRESH_TOKEN_KEY = 'shiftsync_refresh_token';

interface AuthStore extends AuthState {
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isRestoring: true, // Start true so app layout waits for check

  login: async (email: string, password?: string) => {
    set({ isLoading: true });
    try {
      const { accessToken, refreshToken, user } = await authApi.loginWithEmail(email, password);
      
      // Setup the singletons
      setAuthToken(accessToken);
      if (user) setMockUser(user.id);

      // Persist refresh token
      await tokenStorage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      
      // Register Push Token
      try {
        const { registerForPushNotificationsAsync } = await import('../notifications/push');
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          const { apiClient } = await import('../../api/client');
          await apiClient.users.registerDevice(pushToken);
        }
      } catch (e) {
        console.warn("Failed to register push device", e);
      }

      set({ user, accessToken, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    // Clear everything
    setAuthToken('');
    await tokenStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ user: null, accessToken: null });
  },

  restoreSession: async () => {
    set({ isRestoring: true });
    try {
      const refreshToken = await tokenStorage.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        set({ isRestoring: false });
        return;
      }
      
      // Attempt refresh
      const { accessToken, refreshToken: newRefresh, user } = await authApi.refreshSession(refreshToken);
      
      setAuthToken(accessToken);
      if (user) setMockUser(user.id);
      await tokenStorage.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
      
      set({ user, accessToken, isRestoring: false });
    } catch (e) {
      // If refresh fails, wipe session cleanly so user can log in
      await tokenStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
      set({ user: null, accessToken: null, isRestoring: false });
    }
  }
}));
