import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from '@tanstack/react-query';
import { useApi } from '../providers/ApiProvider';
import { Session } from '../types/session';
import { queryKeys } from './queryKeys';
import { toast } from 'sonner';
import {
  SessionStatus,
  UiStatus,
} from '@wholelottahoopla/prompt-backend-client';

// Deserialize helper (same as useSessions)
function deserializeSession(session: any): Session {
  const sbx_config = session.sbx_config || {};
  const repo = session.repo || sbx_config.repo || '';
  const branch = session.branch || sbx_config.branch || '';
  const target_branch =
    session.target_branch || sbx_config.target_branch || 'main';

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

export interface CreateSessionData {
  repo: string;
  target_branch: string;
  messages?: any;
  parent?: string | null;
}

export interface UpdateSessionData {
  title?: string;
  inbox_status?: Session['inbox_status'];
  ui_status?: UiStatus;
  pr_url?: string;
  diff_stats?: {
    additions: number;
    deletions: number;
  };
  session_status?: SessionStatus;
  repo?: string;
  branch?: string;
  target_branch?: string;
}

/**
 * Hook to create a new session.
 *
 * Features:
 * - Automatically invalidates session list cache on success
 * - Shows toast notifications
 * - Returns the created session
 *
 * @example
 * ```tsx
 * const createSession = useCreateSession();
 *
 * const handleCreate = () => {
 *   createSession.mutate({
 *     title: 'Fix bug',
 *     repo: 'owner/repo',
 *     branch: 'feature',
 *     targetBranch: 'main',
 *   });
 * };
 * ```
 */
export function useCreateSession(
  options?: Omit<
    UseMutationOptions<Session, Error, CreateSessionData>,
    'mutationFn'
  >
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSessionData) => {
      const rawResponse = await api.handlersSessionsCreateWithPromptRaw({
        createSessionWithPromptInput: {
          repo: data.repo,
          target_branch: data.target_branch,
          messages: data.messages,
          parent: data.parent || null,
        },
      });

      const rawJson = await rawResponse.raw.json();
      const sessionId = rawJson.session_id || null;

      if (!sessionId) {
        throw new Error('Failed to create session: Invalid response');
      }

      // Fetch the full session
      const response = await api.handlersSessionsRead({ id: sessionId });
      return deserializeSession(response.session);
    },
    onSuccess: (newSession, variables, context) => {
      // Set the new session in the detail cache
      queryClient.setQueryData(
        queryKeys.sessions.detail(newSession.id),
        newSession
      );

      // Optimistically add the new session to all list caches
      queryClient.setQueriesData(
        { queryKey: queryKeys.sessions.lists() },
        (oldSessions: Session[] | undefined) => {
          if (!oldSessions) return [newSession];
          // Add the new session to the beginning of the list
          return [newSession, ...oldSessions];
        }
      );

      // Invalidate and refetch to ensure consistency with backend
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.lists(),
        refetchType: 'active',
      });

      toast.success('Task created successfully');

      // Call user-provided onSuccess if it exists
      options?.onSuccess?.(newSession, variables, context);
    },
    onError: (error, variables, context) => {
      console.error('Failed to create session:', error);
      toast.error('Failed to create task');

      // Call user-provided onError if it exists
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}

/**
 * Hook to update an existing session.
 *
 * Features:
 * - Optimistic updates for better UX
 * - Automatically invalidates affected caches
 * - Rollback on error
 *
 * @example
 * ```tsx
 * const updateSession = useUpdateSession();
 *
 * const handleUpdate = () => {
 *   updateSession.mutate({
 *     id: 'session-123',
 *     data: { inboxStatus: 'completed' },
 *   });
 * };
 * ```
 */
export function useUpdateSession(
  options?: Omit<
    UseMutationOptions<Session, Error, { id: string; data: UpdateSessionData }>,
    'mutationFn'
  >
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSessionData;
    }) => {
      const updateInput: any = { id };

      if (data.title !== undefined) updateInput.title = data.title;
      if (data.session_status !== undefined)
        updateInput.session_status = data.session_status;
      if (data.ui_status !== undefined) updateInput.ui_status = data.ui_status;
      if (data.repo !== undefined) updateInput.repo = data.repo;
      if (data.branch !== undefined) updateInput.branch = data.branch;
      if (data.target_branch !== undefined)
        updateInput.target_branch = data.target_branch;

      await api.handlersSessionsUpdate({ id, updateSessionInput: updateInput });

      // Fetch updated session
      const response = await api.handlersSessionsRead({ id });
      return deserializeSession(response.session);
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.sessions.detail(id),
      });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData<Session>(
        queryKeys.sessions.detail(id)
      );

      // Optimistically update to the new value
      if (previousSession) {
        queryClient.setQueryData<Session>(queryKeys.sessions.detail(id), {
          ...previousSession,
          ...data,
        });
      }

      // Return context with the snapshot
      return { previousSession };
    },
    onSuccess: (updatedSession, variables, context) => {
      // Update the cache with the server response
      queryClient.setQueryData(
        queryKeys.sessions.detail(updatedSession.id),
        updatedSession
      );

      // Invalidate session lists to reflect changes in the sidebar
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.lists(),
        refetchType: 'active',
      });

      toast.success('Task updated successfully');

      options?.onSuccess?.(updatedSession, variables, context);
    },
    onError: (error, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousSession) {
        queryClient.setQueryData(
          queryKeys.sessions.detail(variables.id),
          context.previousSession
        );
      }

      console.error('Failed to update session:', error);
      toast.error('Failed to update task');

      options?.onError?.(error, variables, context);
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(variables.id),
      });
    },
    ...options,
  });
}

/**
 * Hook to archive a session.
 *
 * @example
 * ```tsx
 * const archiveSession = useArchiveSession();
 *
 * const handleArchive = () => {
 *   archiveSession.mutate('session-123');
 * };
 * ```
 */
export function useArchiveSession(
  options?: Omit<UseMutationOptions<Session, Error, string>, 'mutationFn'>
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.handlersSessionsUpdate({
        id,
        updateSessionInput: {
          id,
          session_status: 'Archived' as SessionStatus,
          ui_status: 'Archived' as UiStatus,
        },
      });

      const response = await api.handlersSessionsRead({ id });
      return deserializeSession(response.session);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.sessions.detail(id),
      });

      const previousSession = queryClient.getQueryData<Session>(
        queryKeys.sessions.detail(id)
      );

      if (previousSession) {
        queryClient.setQueryData<Session>(queryKeys.sessions.detail(id), {
          ...previousSession,
          session_status: 'Archived',
          ui_status: 'Archived',
        });
      }

      return { previousSession };
    },
    onSuccess: (archivedSession, id, context) => {
      queryClient.setQueryData(
        queryKeys.sessions.detail(archivedSession.id),
        archivedSession
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.lists(),
        refetchType: 'active',
      });

      toast.success('Task archived');

      options?.onSuccess?.(archivedSession, id, context);
    },
    onError: (error, id, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(
          queryKeys.sessions.detail(id),
          context.previousSession
        );
      }

      console.error('Failed to archive session:', error);
      toast.error('Failed to archive task');

      options?.onError?.(error, id, context);
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.detail(id),
      });
    },
    ...options,
  });
}

/**
 * Hook to unarchive a session.
 *
 * @example
 * ```tsx
 * const unarchiveSession = useUnarchiveSession();
 *
 * const handleUnarchive = () => {
 *   unarchiveSession.mutate('session-123');
 * };
 * ```
 */
export function useUnarchiveSession(
  options?: Omit<UseMutationOptions<Session, Error, string>, 'mutationFn'>
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.handlersSessionsUpdate({
        id,
        updateSessionInput: {
          id,
          session_status: 'Active' as SessionStatus,
        },
      });

      const response = await api.handlersSessionsRead({ id });
      return deserializeSession(response.session);
    },
    onSuccess: (unarchivedSession, id, context) => {
      queryClient.setQueryData(
        queryKeys.sessions.detail(unarchivedSession.id),
        unarchivedSession
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.lists(),
        refetchType: 'active',
      });

      toast.success('Task unarchived');

      options?.onSuccess?.(unarchivedSession, id, context);
    },
    onError: (error, id, context) => {
      console.error('Failed to unarchive session:', error);
      toast.error('Failed to unarchive task');

      options?.onError?.(error, id, context);
    },
    ...options,
  });
}

/**
 * Hook to delete a session.
 *
 * @example
 * ```tsx
 * const deleteSession = useDeleteSession();
 *
 * const handleDelete = () => {
 *   deleteSession.mutate('session-123');
 * };
 * ```
 */
export function useDeleteSession(
  options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.handlersSessionsDelete({ id }),
    onSuccess: (data, id, context) => {
      // Remove the session from the cache
      queryClient.removeQueries({ queryKey: queryKeys.sessions.detail(id) });

      // Invalidate session lists to update the sidebar
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.lists(),
        refetchType: 'active',
      });

      toast.success('Task deleted');

      options?.onSuccess?.(data, id, context);
    },
    onError: (error, id, context) => {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete task');

      options?.onError?.(error, id, context);
    },
    ...options,
  });
}
