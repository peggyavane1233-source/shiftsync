/**
 * Mock vs Real API — CODE TOGGLE ONLY (not shown in the mobile UI).
 *
 * true  = frontend uses local mock handlers (no Spring/Supabase needed)
 * false = frontend calls live gateway at EXPO_PUBLIC_API_URL
 *
 * Flip this flag, then reload Metro/Expo.
 */
export const USE_MOCK_API = true;

export function getUseMockApi(): boolean {
  return USE_MOCK_API;
}
