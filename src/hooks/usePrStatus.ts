import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchPrStatus, PrInfo } from '../services/github/githubService';
import { useUpdateSession } from './useSessionMutations';
import { Session } from '../types/session';
import { queryKeys } from './queryKeys';

/**
 * Hook to fetch PR status from GitHub and update the session with the result.
 * This hook will:
 * 1. Check if a PR exists for the session's branch
 * 2. Fetch the PR status (open, closed, merged)
 * 3. Update the session with prUrl and prStatus if found
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
  const updateSession = useUpdateSession();

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

  // Update session when PR info is fetched
  useEffect(() => {
    if (query.data && session) {
      const needsUpdate =
        query.data.prUrl !== session.prUrl ||
        query.data.status !== session.prStatus;

      if (needsUpdate) {
        console.log('[usePrStatus] Updating session with PR info:', {
          sessionId: session.id,
          prUrl: query.data.prUrl,
          prStatus: query.data.status,
        });

        updateSession.mutate({
          id: session.id,
          data: {
            prUrl: query.data.prUrl,
          },
        });
      }
    }
  }, [query.data, session, updateSession]);

  return {
    prInfo: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
