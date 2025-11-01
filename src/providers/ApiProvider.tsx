import React, { createContext, useContext, ReactNode } from 'react';
import { BackendClient } from '../services/api/types';
import { BackendClientImpl } from '../services/api/backendClient';
import { MockHttpClient } from '../services/http/mockClient';

/**
 * Context for the Backend API client.
 * This allows components to access the backend client throughout the app.
 */
const ApiContext = createContext<BackendClient | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  client?: BackendClient;
}

/**
 * Provider component that makes the backend client available to all child components.
 *
 * @example
 * ```tsx
 * // Use with default mock client
 * <ApiProvider>
 *   <App />
 * </ApiProvider>
 *
 * // Or inject a custom client
 * const httpClient = new RealHttpClient();
 * const backendClient = new BackendClientImpl(httpClient);
 * <ApiProvider client={backendClient}>
 *   <App />
 * </ApiProvider>
 * ```
 */
export const ApiProvider: React.FC<ApiProviderProps> = ({ children, client }) => {
  // Use provided client or create a default one with mock HTTP client
  const backendClient = client ?? new BackendClientImpl(new MockHttpClient());

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
