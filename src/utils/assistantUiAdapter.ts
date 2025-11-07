import { ConversationItem } from '@/hooks/useMessages';
import type { ThreadMessageLike } from '@assistant-ui/react';

/**
 * Converts our conversation data to the format expected by @assistant-ui/react
 */
export function convertConversationToThreadMessages(
  conversation: ConversationItem[]
): ThreadMessageLike[] {
  const messages: ThreadMessageLike[] = [];

  // Handle empty conversation
  if (!conversation || conversation.length === 0) {
    return messages;
  }

  for (const item of conversation) {
    if (item.type === 'prompt') {
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

      // Add all messages for this prompt
      for (const msg of item.messages) {
        // Skip messages without content (like system/init messages)
        if (
          !msg.message ||
          !msg.message.content ||
          !Array.isArray(msg.message.content)
        ) {
          continue;
        }

        const content = msg.message.content.map((c) => {
          console.log('[assistantUiAdapter] Processing content part:', c);
          if (c.type === 'text') {
            console.log('[assistantUiAdapter] Text part - text value:', c.text);
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

        messages.push({
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
        });
      }
    }
  }

  return messages;
}
