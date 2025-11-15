import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import {
  DefaultApi,
  Configuration,
} from '@wholelottahoopla/prompt-backend-client';

/**
 * Context for the Backend API client.
 * This allows components to access the SDK API client throughout the app.
 */
const ApiContext = createContext<DefaultApi | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  client?: DefaultApi;
  backendUrl?: string;
}

/**
 * Provider component that makes the SDK API client available to all child components.
 *
 * @example
 * ```tsx
 * // Use with default backend URL
 * <ApiProvider>
 *   <App />
 * </ApiProvider>
 *
 * // Or inject a custom URL
 * <ApiProvider backendUrl="http://localhost:8000">
 *   <App />
 * </ApiProvider>
 * ```
 */
export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  client,
  backendUrl,
}) => {
  // Create SDK client once - Service Worker handles token injection
  const api = useMemo(() => {
    if (client) return client;

    const config = new Configuration({
      basePath:
        backendUrl ||
        import.meta.env.VITE_BACKEND_URL ||
        'https://prompt-backend-production.up.railway.app',
      credentials: 'include', // Required for Service Worker to inject Bearer tokens
    });

    return new DefaultApi(config);
  }, [client, backendUrl]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

/**
 * Hook to access the SDK API client from any component.
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
 *     const response = await api.handlersSessionsList();
 *     console.log(response.sessions);
 *   };
 *
 *   return <button onClick={loadSessions}>Load Sessions</button>;
 * }
 * ```
 */
export const useApi = (): DefaultApi => {
  const context = useContext(ApiContext);

  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }

  return context;
};
