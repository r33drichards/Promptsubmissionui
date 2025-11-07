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

  it('should convert tool_use to tool-call', () => {
    const prompt: Prompt = {
      id: 'prompt-2',
      sessionId: 'session-1',
      content: 'Run a bash command',
      createdAt: new Date('2025-01-01'),
      status: 'completed',
    };

    const message: BackendMessage = {
      type: 'assistant',
      uuid: 'msg-2',
      message: {
        id: 'msg-2',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'bash',
            input: { command: 'ls -la' },
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

    expect(result[1].content[0]).toEqual({
      type: 'tool-call',
      toolName: 'bash',
      toolCallId: 'tool-1',
      args: { command: 'ls -la' },
    });
  });

  it('should convert tool_result to tool-result', () => {
    const prompt: Prompt = {
      id: 'prompt-3',
      sessionId: 'session-1',
      content: 'Run a bash command',
      createdAt: new Date('2025-01-01'),
      status: 'completed',
    };

    const toolResultMessage: BackendMessage = {
      type: 'user',
      uuid: 'msg-3',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'file1.txt\nfile2.txt',
          },
        ],
      },
      session_id: 'session-1',
    };

    const conversation: ConversationItem[] = [
      {
        type: 'prompt',
        data: prompt,
        messages: [toolResultMessage],
      },
    ];

    const result = convertConversationToMessages(conversation);

    expect(result[1].content[0]).toEqual({
      type: 'tool-result',
      toolCallId: 'tool-1',
      result: 'file1.txt\nfile2.txt',
    });
  });

  it('should preserve token usage in metadata', () => {
    const prompt: Prompt = {
      id: 'prompt-4',
      sessionId: 'session-1',
      content: 'Test prompt',
      createdAt: new Date('2025-01-01'),
      status: 'completed',
    };

    const message: BackendMessage = {
      type: 'assistant',
      uuid: 'msg-4',
      message: {
        id: 'msg-4',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_read_input_tokens: 25,
        },
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

    expect(result[1].metadata).toEqual({
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 25,
      },
    });
  });
});
