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
        content: [{ type: 'text', text: item.data.content ?? '' }],
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

      // First pass: collect all tool_use and tool_result items across ALL messages in this prompt
      const toolCallMap = new Map<string, any>();

      // Collect all tool_use items
      for (const msg of item.messages) {
        if (!msg.message?.content || !Array.isArray(msg.message.content)) {
          continue;
        }
        for (const c of msg.message.content) {
          if (c.type === 'tool_use') {
            toolCallMap.set(c.id, {
              type: 'tool-call' as const,
              toolName: c.name || '',
              toolCallId: c.id || '',
              args: c.input,
              argsText: c.input != null ? JSON.stringify(c.input, null, 2) : '{}',
            });
          }
        }
      }

      // Second pass: merge tool_result into matching tool_use items
      for (const msg of item.messages) {
        if (!msg.message?.content || !Array.isArray(msg.message.content)) {
          continue;
        }
        for (const c of msg.message.content) {
          if (c.type === 'tool_result' && c.tool_use_id) {
            const toolCall = toolCallMap.get(c.tool_use_id);
            if (toolCall) {
              // Extract text from content blocks if it's an array
              let resultText = c.content;
              if (Array.isArray(c.content) && c.content.length > 0) {
                const textBlock = c.content.find(
                  (block: any) => block.type === 'text'
                );
                resultText = textBlock?.text || JSON.stringify(c.content);
              }
              // Ensure result is always a string, never undefined or null
              toolCall.result = resultText != null ? String(resultText) : '';
            }
          }
        }
      }

      // Third pass: add messages to the thread, replacing tool calls with merged versions
      for (const msg of item.messages) {
        // Skip messages without content (like system/init messages)
        if (
          !msg.message ||
          !msg.message.content ||
          !Array.isArray(msg.message.content)
        ) {
          continue;
        }

        const content = msg.message.content
          .map((c) => {
            if (c.type === 'text') {
              // Ensure text is never null or undefined - always use a string
              const textValue = c.text ?? '';
              // Skip empty text blocks to avoid rendering issues
              if (textValue === '') {
                return null;
              }
              return { type: 'text' as const, text: textValue };
            }
            if (c.type === 'tool_use') {
              return toolCallMap.get(c.id) ?? null;
            }
            // Skip standalone tool_result (already merged into tool_use)
            if (c.type === 'tool_result') {
              return null;
            }
            return null;
          })
          .filter((c) => c !== null && c !== undefined);

        // Skip messages with empty content to prevent rendering errors
        if (content.length === 0) {
          continue;
        }

        // Debug: log if we have tool calls
        const toolCalls = content.filter((c: any) => c.type === 'tool-call');
        if (toolCalls.length > 0) {
          console.log(
            `[assistantUiAdapter] Message ${msg.uuid} (role: ${msg.message.role || msg.type}) has ${toolCalls.length} tool calls:`,
            JSON.stringify(toolCalls, null, 2)
          );
        }

        // Validate that all content has proper text values
        const validatedContent = content.map((c: any) => {
          if (c.type === 'text') {
            return { ...c, text: c.text ?? '' };
          }
          if (c.type === 'tool-call') {
            return {
              ...c,
              toolName: c.toolName ?? '',
              toolCallId: c.toolCallId ?? '',
              argsText: c.argsText ?? '{}',
              result: c.result ?? undefined,  // result can be undefined if tool hasn't returned yet
            };
          }
          return c;
        });

        messages.push({
          id: msg.uuid,
          role: msg.message.role || (msg.type as 'user' | 'assistant'),
          content: validatedContent,
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
