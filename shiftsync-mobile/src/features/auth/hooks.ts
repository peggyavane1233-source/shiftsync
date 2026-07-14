/**
 * src/features/auth/hooks.ts
 * PURPOSE: Easy consumption of auth state by UI components.
 */
import { useAuthStore } from './store';

export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    user: store.user,
    isAuthenticated: !!store.accessToken,
    isLoading: store.isLoading,
    isRestoring: store.isRestoring,
    login: store.login,
    logout: store.logout,
    restoreSession: store.restoreSession,
    
    // Role Helpers
    isWorker: store.user?.role === 'WORKER',
    isSupervisor: store.user?.role === 'SUPERVISOR',
    isSafety: store.user?.role === 'SAFETY',
    isAdmin: store.user?.role === 'ADMIN',
  };
};
