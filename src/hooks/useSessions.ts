import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useApi } from '../providers/ApiProvider';
import { Session } from '../types/session';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch a list of sessions with optional filters.
 *
 * @example
 * ```tsx
 * const { data: sessions, isLoading, error } = useSessions();
 * ```
 */
export function useSessions(
  _params?: any,
  options?: Omit<UseQueryOptions<Session[]>, 'queryKey' | 'queryFn'>
) {
  const api = useApi();

  return useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: async () => {
      const response = await api.handlersSessionsList();
      return response.sessions || [];
    },
    ...options,
  });
}

/**
 * Hook to fetch a single session by ID.
 *
 * @example
 * ```tsx
 * const { data: session, isLoading, error } = useSession('session-123');
 * ```
 */
export function useSession(
  id: string,
  options?: Omit<UseQueryOptions<Session>, 'queryKey' | 'queryFn'>
) {
  const api = useApi();

  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: async () => {
      const response = await api.handlersSessionsRead({ id });
      return response.session;
    },
    enabled: !!id, // Only fetch if ID is provided
    ...options,
  });
}
