import { useMemo } from 'react';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import type { ExternalStoreAdapter } from '@assistant-ui/react';
import { ConversationItem } from './useMessages';
import { convertConversationToThreadMessages } from '@/utils/assistantUiAdapter';
import { useCreatePrompt } from './useMessages';

export function useAssistantRuntime(
  sessionId: string,
  conversation: ConversationItem[],
  isLoading: boolean
) {
  const createPrompt = useCreatePrompt(sessionId);

  const messages = useMemo(
    () => convertConversationToThreadMessages(conversation),
    [conversation]
  );

  const adapter: ExternalStoreAdapter = useMemo(
    () => ({
      isLoading,
      messages,
      onNew: async (message) => {
        // Extract text content from message
        const content =
          message.content.find((p) => p.type === 'text')?.text || '';
        if (content.trim()) {
          await createPrompt.mutateAsync(content);
        }
      },
    }),
    [messages, isLoading, createPrompt]
  );

  return useExternalStoreRuntime(adapter);
}
