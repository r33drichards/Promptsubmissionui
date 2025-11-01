import { ListSessionsParams } from '../services/api/types';

/**
 * Centralized query keys for TanStack Query cache management.
 * This ensures consistent cache invalidation and refetching.
 */
export const queryKeys = {
  // Session query keys
  sessions: {
    all: ['sessions'] as const,
    lists: () => [...queryKeys.sessions.all, 'list'] as const,
    list: (params?: ListSessionsParams) => [...queryKeys.sessions.lists(), params] as const,
    details: () => [...queryKeys.sessions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sessions.details(), id] as const,
  },

  // Message query keys
  messages: {
    all: ['messages'] as const,
    lists: () => [...queryKeys.messages.all, 'list'] as const,
    list: (sessionId: string) => [...queryKeys.messages.lists(), sessionId] as const,
  },
} as const;
