import React, { createContext, useContext, ReactNode, useMemo, useRef } from 'react';
import { useOidcAccessToken } from '@axa-fr/react-oidc';
import { BackendClient } from '../services/api/types';
import { BackendClientImpl } from '../services/api/backendClient';
import { PromptBackendClient } from '../services/api/promptBackendClient';
import { MockHttpClient } from '../services/http/mockClient';

/**
 * Context for the Backend API client.
 * This allows components to access the backend client throughout the app.
 */
const ApiContext = createContext<BackendClient | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  client?: BackendClient;
  useMock?: boolean;
  backendUrl?: string;
}

/**
 * Provider component that makes the backend client available to all child components.
 *
 * @example
 * ```tsx
 * // Use with real backend client
 * <ApiProvider>
 *   <App />
 * </ApiProvider>
 *
 * // Use with mock client for testing
 * <ApiProvider useMock={true}>
 *   <App />
 * </ApiProvider>
 *
 * // Or inject a custom client with custom URL
 * const backendClient = new PromptBackendClient('http://localhost:8000');
 * <ApiProvider client={backendClient}>
 *   <App />
 * </ApiProvider>
 * ```
 */
export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  client,
  useMock = false,
  backendUrl
}) => {
  const { accessToken } = useOidcAccessToken();

  // Use a ref to always have the latest access token
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  // Create backend client once, using a function that always gets the latest token
  const backendClient = useMemo(() => {
    if (client) return client;
    if (useMock) return new BackendClientImpl(new MockHttpClient());

    // Return a function that reads from the ref, ensuring we always get the latest token
    return new PromptBackendClient(backendUrl, () => accessTokenRef.current);
  }, [client, useMock, backendUrl]);

  return <ApiContext.Provider value={backendClient}>{children}</ApiContext.Provider>;
};

/**
 * Hook to access the backend client from any component.
 * Must be used within an ApiProvider.
 *
 * @throws {Error} If used outside of an ApiProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const api = useApi();
 *
 *   const loadSessions = async () => {
 *     const sessions = await api.sessions.list();
 *     console.log(sessions);
 *   };
 *
 *   return <button onClick={loadSessions}>Load Sessions</button>;
 * }
 * ```
 */
export const useApi = (): BackendClient => {
  const context = useContext(ApiContext);

  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }

  return context;
};
