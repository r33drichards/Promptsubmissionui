import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useApi } from '../providers/ApiProvider';
import { Session } from '../types/session';
import { CreateSessionData, UpdateSessionData } from '../services/api/types';
import { queryKeys } from './queryKeys';
import { toast } from 'sonner';

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
  options?: Omit<UseMutationOptions<Session, Error, CreateSessionData>, 'mutationFn'>
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSessionData) => api.sessions.create(data),
    onSuccess: (newSession, variables, context) => {
      // Invalidate and refetch session lists
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

      // Optionally set the data in the cache for the new session
      queryClient.setQueryData(queryKeys.sessions.detail(newSession.id), newSession);

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
    mutationFn: ({ id, data }: { id: string; data: UpdateSessionData }) =>
      api.sessions.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions.detail(id) });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData<Session>(queryKeys.sessions.detail(id));

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
      queryClient.setQueryData(queryKeys.sessions.detail(updatedSession.id), updatedSession);

      // Invalidate session lists to reflect changes
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

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
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(variables.id) });
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
    mutationFn: (id: string) => api.sessions.archive(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.sessions.detail(id) });

      const previousSession = queryClient.getQueryData<Session>(queryKeys.sessions.detail(id));

      if (previousSession) {
        queryClient.setQueryData<Session>(queryKeys.sessions.detail(id), {
          ...previousSession,
          archived: true,
        });
      }

      return { previousSession };
    },
    onSuccess: (archivedSession, id, context) => {
      queryClient.setQueryData(queryKeys.sessions.detail(archivedSession.id), archivedSession);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

      toast.success('Task archived');

      options?.onSuccess?.(archivedSession, id, context);
    },
    onError: (error, id, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(queryKeys.sessions.detail(id), context.previousSession);
      }

      console.error('Failed to archive session:', error);
      toast.error('Failed to archive task');

      options?.onError?.(error, id, context);
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(id) });
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
    mutationFn: (id: string) => api.sessions.unarchive(id),
    onSuccess: (unarchivedSession, id, context) => {
      queryClient.setQueryData(queryKeys.sessions.detail(unarchivedSession.id), unarchivedSession);
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

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
    mutationFn: (id: string) => api.sessions.delete(id),
    onSuccess: (data, id, context) => {
      // Remove the session from the cache
      queryClient.removeQueries({ queryKey: queryKeys.sessions.detail(id) });

      // Invalidate session lists
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

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
