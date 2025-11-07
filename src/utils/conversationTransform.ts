import { ConversationItem } from '@/hooks/useMessages';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: 'text' | 'tool-call' | 'tool-result';
    text?: string;
    toolName?: string;
    toolCallId?: string;
    args?: any;
    result?: any;
  }>;
  metadata?: {
    isPrompt?: boolean;
    status?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
    };
  };
}

export function convertConversationToMessages(
  conversation: ConversationItem[]
): AssistantMessage[] {
  const messages: AssistantMessage[] = [];

  for (const item of conversation) {
    if (item.type === 'prompt') {
      // Add prompt as system message
      messages.push({
        id: item.data.id,
        role: 'system',
        content: [
          {
            type: 'text',
            text: item.data.content,
          },
        ],
        metadata: {
          isPrompt: true,
          status: item.data.status,
        },
      });

      // Add all messages for this prompt
      for (const msg of item.messages) {
        console.log('[DEBUG] Processing message:', msg);
        // Skip messages without content (like system/init messages)
        if (
          !msg.message ||
          !msg.message.content ||
          !Array.isArray(msg.message.content)
        ) {
          console.log('[DEBUG] Skipping message - missing content:', msg);
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
              type: 'tool-result' as const,
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
          metadata: msg.message.usage
            ? {
                usage: msg.message.usage,
              }
            : undefined,
        });
      }
    }
  }

  return messages;
}
