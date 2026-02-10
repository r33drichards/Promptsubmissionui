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

      // Build a map of tool_use_id -> tool_result for matching
      const toolResultMap = new Map<string, any>();
      for (const msg of item.messages) {
        if (
          msg.message &&
          msg.message.content &&
          Array.isArray(msg.message.content)
        ) {
          for (const c of msg.message.content) {
            if (c.type === 'tool_result' && c.tool_use_id) {
              toolResultMap.set(c.tool_use_id, c.content);
            }
          }
        }
      }

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
          if (c.type === 'text') {
            return { type: 'text' as const, text: c.text || '' };
          }
          if (c.type === 'tool_use') {
            // Check if there's a matching result for this tool call
            const result = toolResultMap.get(c.id || '');
            return {
              type: 'tool-call' as const,
              toolName: c.name || '',
              toolCallId: c.id || '',
              args: c.input,
              result: result, // Include the result with the tool call
            };
          }
          if (c.type === 'tool_result') {
            // Skip standalone tool results as they're now merged with tool calls
            return null;
          }
          return { type: 'text' as const, text: '' };
        }).filter((c): c is NonNullable<typeof c> => c !== null); // Filter out null entries

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
