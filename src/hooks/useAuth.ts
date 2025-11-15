import { useOidc } from '@axa-fr/react-oidc';

/**
 * Custom hook that wraps useOidc to handle auth-disabled mode
 * When VITE_DISABLE_AUTH is true, this returns mock auth values
 * instead of the real OIDC values.
 */
export function useAuth() {
  const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';
  const oidc = useOidc();

  if (isAuthDisabled) {
    // Return mock values when auth is disabled
    return {
      ...oidc,
      isAuthenticated: false,
      logout: () => {},
      login: () => {},
    };
  }

  // Use real OIDC values when auth is enabled
  return oidc;
}
