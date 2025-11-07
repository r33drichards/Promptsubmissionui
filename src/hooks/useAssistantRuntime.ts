import { useMemo } from 'react';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import type { ExternalStoreAdapter } from '@assistant-ui/react';
import { ConversationItem } from './useMessages';
import { convertConversationToThreadMessages } from '@/utils/assistantUiAdapter';

export function useAssistantRuntime(
  conversation: ConversationItem[],
  isLoading: boolean
) {
  const messages = useMemo(
    () => convertConversationToThreadMessages(conversation),
    [conversation]
  );

  const adapter: ExternalStoreAdapter = useMemo(
    () => ({
      isLoading,
      messages,
      onNew: async () => {
        // This is a read-only view, so we don't handle new messages here
        // The actual message sending is handled by the SessionDetail component
      },
    }),
    [messages, isLoading]
  );

  return useExternalStoreRuntime(adapter);
}
