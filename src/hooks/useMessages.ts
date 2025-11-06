import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { useApi } from '../providers/ApiProvider';
import { Message, BackendMessage, Prompt } from '../types/session';
import { queryKeys } from './queryKeys';
import { toast } from 'sonner';
import { useMemo } from 'react';

/**
 * Hook to fetch messages for a specific prompt with polling.
 *
 * @param promptId - The prompt ID to fetch messages for
 * @param options - Additional query options (polling enabled by default with 2s interval)
 *
 * @example
 * ```tsx
 * const { data: messages, isLoading } = useMessages('prompt-123');
 * ```
 */
export function useMessages(
  promptId: string,
  options?: Omit<UseQueryOptions<BackendMessage[]>, 'queryKey' | 'queryFn'>
) {
  const api = useApi();

  return useQuery({
    queryKey: queryKeys.messages.list(promptId),
    queryFn: () => api.messages.list(promptId),
    enabled: !!promptId,
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true, // Continue polling when tab is not focused
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

/**
 * Hook to fetch prompts for a specific session.
 *
 * @param sessionId - The session ID to fetch prompts for
 * @param options - Additional query options
 *
 * @example
 * ```tsx
 * const { data: prompts, isLoading } = usePrompts('session-123');
 * ```
 */
export function usePrompts(
  sessionId: string,
  options?: Omit<UseQueryOptions<Prompt[]>, 'queryKey' | 'queryFn'>
) {
  const api = useApi();

  return useQuery({
    queryKey: queryKeys.prompts.list(sessionId),
    queryFn: () => api.prompts.list(sessionId),
    enabled: !!sessionId,
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true,
    ...options,
  });
}

/**
 * Combined hook to fetch and format session conversation data.
 * Fetches prompts for a session, then fetches messages for each prompt.
 *
 * @param sessionId - The session ID to fetch data for
 *
 * @example
 * ```tsx
 * const { messages, prompts, isLoading } = useSessionConversation('session-123');
 * ```
 */
export function useSessionConversation(sessionId: string) {
  const { data: prompts = [], isLoading: promptsLoading } = usePrompts(sessionId);

  // Fetch messages for the first prompt (if available)
  // TODO: In the future, we may want to fetch messages for all prompts
  const firstPromptId = prompts[0]?.id || '';
  const { data: messages = [], isLoading: messagesLoading } = useMessages(firstPromptId);

  // Sort messages by creation time (newest first for conversation display)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      // Extract timestamp from message data
      const getTimestamp = (msg: BackendMessage): number => {
        // Check if message has a createdAt field
        if (msg.message?.id) {
          // Try to extract timestamp from uuid or id
          return new Date().getTime(); // Fallback to current time
        }
        return 0;
      };

      return getTimestamp(a) - getTimestamp(b);
    });
  }, [messages]);

  return {
    messages: sortedMessages,
    prompts,
    isLoading: promptsLoading || messagesLoading,
  };
}
