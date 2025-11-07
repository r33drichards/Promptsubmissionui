import { ConversationItem } from '@/hooks/useMessages';
import type { ThreadMessageLike } from '@assistant-ui/react';

/**
 * Converts our conversation data to the format expected by @assistant-ui/react
 */
export function convertConversationToThreadMessages(
  conversation: ConversationItem[]
): ThreadMessageLike[] {
  console.log('[DEBUG assistantUiAdapter] Converting conversation to thread messages');
  console.log('[DEBUG assistantUiAdapter] Conversation items:', conversation);

  const messages: ThreadMessageLike[] = [];

  // Handle empty conversation
  if (!conversation || conversation.length === 0) {
    console.log('[DEBUG assistantUiAdapter] Empty conversation, returning empty messages');
    return messages;
  }

  for (const item of conversation) {
    console.log('[DEBUG assistantUiAdapter] Processing conversation item:', item);

    if (item.type === 'prompt') {
      console.log('[DEBUG assistantUiAdapter] Adding prompt as user message:', item.data);
      // Add prompt as user message (showing what the user requested)
      messages.push({
        id: item.data.id,
        role: 'user',
        content: [{ type: 'text', text: item.data.content }],
        createdAt: new Date(item.data.createdAt),
        status: { type: 'complete', reason: 'stop' },
        metadata: {
          submittedFeedback: undefined,
          custom: {
            isPrompt: true,
            status: item.data.status,
          },
        },
      });

      console.log(`[DEBUG assistantUiAdapter] Processing ${item.messages.length} messages for this prompt`);

      // Add all messages for this prompt
      for (const msg of item.messages) {
        console.log('[DEBUG assistantUiAdapter] Processing message:', msg);

        // Skip messages without content (like system/init messages)
        if (
          !msg.message ||
          !msg.message.content ||
          !Array.isArray(msg.message.content)
        ) {
          console.log('[DEBUG assistantUiAdapter] Skipping message - no content:', msg);
          continue;
        }

        const content = msg.message.content.map((c) => {
          if (c.type === 'text') {
            return { type: 'text' as const, text: c.text || '' };
          }
          if (c.type === 'tool_use') {
            return {
              type: 'tool-call' as const,
              toolName: c.name || '',
              toolCallId: c.id || '',
              args: c.input,
            };
          }
          if (c.type === 'tool_result') {
            return {
              type: 'tool-call' as const,
              toolName: 'result',
              toolCallId: c.tool_use_id || '',
              result: c.content,
            };
          }
          return { type: 'text' as const, text: '' };
        });

        const threadMessage = {
          id: msg.uuid,
          role: msg.message.role || (msg.type as 'user' | 'assistant'),
          content,
          createdAt: new Date(),
          status: { type: 'complete', reason: 'stop' },
          metadata: {
            submittedFeedback: undefined,
            custom: msg.message.usage
              ? {
                  usage: msg.message.usage,
                }
              : undefined,
          },
        };

        console.log('[DEBUG assistantUiAdapter] Adding thread message:', threadMessage);
        messages.push(threadMessage);
      }
    }
  }

  console.log('[DEBUG assistantUiAdapter] Final converted messages:', messages);
  console.log(`[DEBUG assistantUiAdapter] Total messages converted: ${messages.length}`);
  return messages;
}
