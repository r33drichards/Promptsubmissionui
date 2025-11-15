import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useApi } from '../providers/ApiProvider';
import { Session } from '../types/session';
import { queryKeys } from './queryKeys';
import { UiStatus } from '@wholelottahoopla/prompt-backend-client';

// Helper to deserialize sessions from API
function deserializeSession(session: any): Session {
  const sbx_config = session.sbx_config || {};
  const repo = session.repo || sbx_config.repo || '';
  const branch = session.branch || sbx_config.branch || '';
  const target_branch =
    session.target_branch || sbx_config.target_branch || 'main';

  // Map session_status to inbox_status
  const sessionStatusToInboxStatus = (status: string) => {
    const map: Record<string, Session['inbox_status']> = {
      Active: 'in-progress',
      Archived: 'completed',
      Completed: 'completed',
    };
    return map[status] || 'pending';
  };

  return {
    id: session.id || '',
    title: session.title || '',
    repo,
    branch,
    target_branch,
    messages: null,
    inbox_status: sessionStatusToInboxStatus(
      session.session_status || 'Active'
    ),
    ui_status: (session.ui_status || 'Pending') as UiStatus,
    session_status: session.session_status || 'Active',
    parent: session.parent || null,
    created_at: new Date(session.created_at || new Date().toISOString()),
    diff_stats: session.diff_stats,
    pr_url: session.pr_url,
    children: session.children
      ? session.children.map(deserializeSession)
      : undefined,
    sbx_config: session.sbx_config || null,
  };
}

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
      return (response.sessions || []).map(deserializeSession);
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
      return deserializeSession(response.session);
    },
    enabled: !!id, // Only fetch if ID is provided
    ...options,
  });
}
