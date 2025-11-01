import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useApi } from '../providers/ApiProvider';
import { Session } from '../types/session';
import { ListSessionsParams } from '../services/api/types';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch a list of sessions with optional filters.
 *
 * @example
 * ```tsx
 * const { data: sessions, isLoading, error } = useSessions({ status: 'pending' });
 * ```
 */
export function useSessions(
  params?: ListSessionsParams,
  options?: Omit<UseQueryOptions<Session[]>, 'queryKey' | 'queryFn'>
) {
  const api = useApi();

  return useQuery({
    queryKey: queryKeys.sessions.list(params),
    queryFn: () => api.sessions.list(params),
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
    queryFn: () => api.sessions.get(id),
    enabled: !!id, // Only fetch if ID is provided
    ...options,
  });
}
