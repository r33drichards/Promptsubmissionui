import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { useApi } from '../providers/ApiProvider';
import { Message } from '../types/session';
import { queryKeys } from './queryKeys';
import { toast } from 'sonner';

/**
 * Hook to fetch messages for a specific session.
 *
 * @example
 * ```tsx
 * const { data: messages, isLoading } = useMessages('session-123');
 * ```
 */
export function useMessages(
  sessionId: string,
  options?: Omit<UseQueryOptions<Message[]>, 'queryKey' | 'queryFn'>
) {
  const api = useApi();

  return useQuery({
    queryKey: queryKeys.messages.list(sessionId),
    queryFn: () => api.messages.list(sessionId),
    enabled: !!sessionId,
    ...options,
  });
}

/**
 * Hook to create a new message in a session.
 *
 * Features:
 * - Optimistic updates for instant feedback
 * - Automatically invalidates message cache
 * - Rollback on error
 *
 * @example
 * ```tsx
 * const createMessage = useCreateMessage('session-123');
 *
 * const handleSend = () => {
 *   createMessage.mutate('Hello, world!');
 * };
 * ```
 */
export function useCreateMessage(
  sessionId: string,
  options?: Omit<UseMutationOptions<Message, Error, string>, 'mutationFn'>
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => api.messages.create(sessionId, content),
    onMutate: async (content) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.messages.list(sessionId) });

      // Snapshot the previous messages
      const previousMessages = queryClient.getQueryData<Message[]>(
        queryKeys.messages.list(sessionId)
      );

      // Optimistically add the new message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      if (previousMessages) {
        queryClient.setQueryData<Message[]>(queryKeys.messages.list(sessionId), [
          ...previousMessages,
          optimisticMessage,
        ]);
      }

      return { previousMessages, optimisticMessage };
    },
    onSuccess: (newMessage, content, context) => {
      // Replace optimistic message with real one
      const messages = queryClient.getQueryData<Message[]>(queryKeys.messages.list(sessionId));

      if (messages && context?.optimisticMessage) {
        const updatedMessages = messages.map((msg) =>
          msg.id === context.optimisticMessage.id ? newMessage : msg
        );
        queryClient.setQueryData(queryKeys.messages.list(sessionId), updatedMessages);
      }

      // Also invalidate session details as the message count may have changed
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) });

      toast.success('Message sent');

      options?.onSuccess?.(newMessage, content, context);
    },
    onError: (error, content, context) => {
      // Rollback to previous messages on error
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages.list(sessionId), context.previousMessages);
      }

      console.error('Failed to send message:', error);
      toast.error('Failed to send message');

      options?.onError?.(error, content, context);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.list(sessionId) });
    },
    ...options,
  });
}
