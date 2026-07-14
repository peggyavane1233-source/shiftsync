/**
 * src/features/auth/types.ts
 * PURPOSE: Domain types specific to Authentication.
 */
import { User } from '../../types';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isRestoring: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
