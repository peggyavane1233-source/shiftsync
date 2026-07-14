/**
 * app/(admin)/index.tsx
 * PURPOSE: Redirect to the primary dashboard view.
 */
import { Redirect } from 'expo-router';

export default function AdminIndex() {
  return <Redirect href="/(admin)/dashboard" />;
}
