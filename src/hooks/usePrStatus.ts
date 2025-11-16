import { useQuery } from '@tanstack/react-query';
import { fetchPrStatus, PrInfo } from '../services/github/githubService';
import { Session } from '../types/session';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch PR status from GitHub API and derive state dynamically.
 * This hook will:
 * 1. Check if a PR exists for the session's branch
 * 2. Fetch the PR status (open, closed, merged) from GitHub
 * 3. Return the PR info for display in the UI
 *
 * The PR status is derived from GitHub API in real-time, not from stored state.
 * This ensures the UI always shows the current state of the PR without storing
 * it in the session, which could cause infinite loops or stale data.
 *
 * @param session - The session to check PR status for
 * @param options - Query options
 */
export function usePrStatus(
  session: Session | null | undefined,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  const enabled =
    options?.enabled !== false &&
    !!session &&
    !!session.repo &&
    !!session.branch &&
    !!session.targetBranch;

  const query = useQuery({
    queryKey: queryKeys.github.prStatus(
      session?.repo || '',
      session?.branch || '',
      session?.targetBranch || ''
    ),
    queryFn: async (): Promise<PrInfo | null> => {
      if (!session) return null;
      return fetchPrStatus(session.repo, session.branch, session.targetBranch);
    },
    enabled,
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: options?.refetchInterval || 30000, // Refetch every 30 seconds by default
    refetchIntervalInBackground: false,
  });

  return {
    prInfo: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
