import { describe, it, expect } from 'vitest';
import { convertConversationToMessages } from '../conversationTransform';
import { ConversationItem } from '@/hooks/useMessages';
import { Prompt, BackendMessage } from '@/types/session';

describe('convertConversationToMessages', () => {
  it('should convert a simple prompt with text message', () => {
    const prompt: Prompt = {
      id: 'prompt-1',
      sessionId: 'session-1',
      content: 'Write a hello world function',
      createdAt: new Date('2025-01-01'),
      status: 'completed',
    };

    const message: BackendMessage = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        id: 'msg-1',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Here is a hello world function',
          },
        ],
      },
      session_id: 'session-1',
    };

    const conversation: ConversationItem[] = [
      {
        type: 'prompt',
        data: prompt,
        messages: [message],
      },
    ];

    const result = convertConversationToMessages(conversation);

    expect(result).toHaveLength(2); // Prompt + assistant message
    expect(result[0]).toEqual({
      id: 'prompt-1',
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'Write a hello world function',
        },
      ],
      metadata: {
        isPrompt: true,
        status: 'completed',
      },
    });
    expect(result[1]).toEqual({
      id: 'msg-1',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Here is a hello world function',
        },
      ],
    });
  });
});
