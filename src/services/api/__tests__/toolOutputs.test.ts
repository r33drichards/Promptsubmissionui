import { describe, it, expect, vi } from 'vitest';
import { BackendClientImpl } from '../backendClient';
import { HttpClient } from '../../http/types';

describe('BackendClient - Tool Outputs', () => {
  it('should preserve tool_use and tool_result in messages', async () => {
    // Sample data from the real backend (snake_case)
    const mockBackendResponse = {
      messages: [
        {
          id: '842ce730-2b23-438e-8dbd-c7c5fc3be59f',
          prompt_id: '75eeb2a5-09d5-4de8-9b5f-9da1f000685b',
          data: {
            message: {
              content: [
                {
                  id: 'toolu_01M5NyE9bsGD84tzHbgpCqNG',
                  input: {
                    description: 'Find details view component',
                    prompt: 'Find the details view component...',
                    subagent_type: 'Explore',
                  },
                  name: 'Task',
                  type: 'tool_use',
                },
              ],
              id: 'msg_01Bkjt3G5fooe9ovZQj4en6b',
              model: 'claude-sonnet-4-5-20250929',
              role: 'assistant',
              type: 'message',
              usage: {
                cache_creation_input_tokens: 8465,
                cache_read_input_tokens: 6894,
                input_tokens: 2,
                output_tokens: 1,
              },
            },
            parent_tool_use_id: null,
            session_id: '2cc817b9-ce69-4287-bdc9-6b9accb5d3c1',
            type: 'assistant',
            uuid: 'c3959230-e8c6-4e40-a94d-7f36b97a359e',
          },
          created_at: '2025-11-07 07:39:32.018731 +00:00',
          updated_at: '2025-11-07 07:39:32.018731 +00:00',
        },
        {
          id: '2bd061d2-d848-44c6-ad31-6ba8ac901016',
          prompt_id: '75eeb2a5-09d5-4de8-9b5f-9da1f000685b',
          data: {
            message: {
              content: [
                {
                  content: [
                    {
                      text: 'This is the tool result output',
                      type: 'text',
                    },
                  ],
                  tool_use_id: 'toolu_01M5NyE9bsGD84tzHbgpCqNG',
                  type: 'tool_result',
                },
              ],
              role: 'user',
            },
            parent_tool_use_id: null,
            session_id: '2cc817b9-ce69-4287-bdc9-6b9accb5d3c1',
            type: 'user',
            uuid: '7c0d1cad-ae0d-4f7b-a802-b04c5e40287a',
          },
          created_at: '2025-11-07 07:39:44.912327 +00:00',
          updated_at: '2025-11-07 07:39:44.912327 +00:00',
        },
      ],
    };

    // Mock HTTP client
    const mockHttpClient: HttpClient = {
      get: vi.fn().mockResolvedValue({ data: mockBackendResponse }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const client = new BackendClientImpl(mockHttpClient);

    // Call messages.list
    const result = await client.messages.list(
      '75eeb2a5-09d5-4de8-9b5f-9da1f000685b'
    );

    // Verify the endpoint was called correctly
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/api/prompts/75eeb2a5-09d5-4de8-9b5f-9da1f000685b/messages'
    );

    // Verify we got 2 messages back
    expect(result).toHaveLength(2);

    // Verify first message (tool_use) structure is preserved
    const toolUseMessage = result[0];
    expect(toolUseMessage.id).toBe('842ce730-2b23-438e-8dbd-c7c5fc3be59f');
    expect(toolUseMessage.promptId).toBe(
      '75eeb2a5-09d5-4de8-9b5f-9da1f000685b'
    );
    expect(toolUseMessage.data).toBeDefined();
    expect(toolUseMessage.data.type).toBe('assistant');
    expect(toolUseMessage.data.uuid).toBe(
      'c3959230-e8c6-4e40-a94d-7f36b97a359e'
    );

    // CRITICAL: Verify tool_use content is preserved
    expect(toolUseMessage.data.message.content).toHaveLength(1);
    expect(toolUseMessage.data.message.content[0].type).toBe('tool_use');
    expect(toolUseMessage.data.message.content[0].name).toBe('Task');
    expect(toolUseMessage.data.message.content[0].id).toBe(
      'toolu_01M5NyE9bsGD84tzHbgpCqNG'
    );
    expect(toolUseMessage.data.message.content[0].input).toEqual({
      description: 'Find details view component',
      prompt: 'Find the details view component...',
      subagentType: 'Explore', // Note: camelCase conversion
    });

    // Verify usage information is preserved
    expect(toolUseMessage.data.message.usage).toEqual({
      cacheCreationInputTokens: 8465,
      cacheReadInputTokens: 6894,
      inputTokens: 2,
      outputTokens: 1,
    });

    // Verify dates are converted to Date objects
    expect(toolUseMessage.createdAt).toBeInstanceOf(Date);
    expect(toolUseMessage.updatedAt).toBeInstanceOf(Date);

    // Verify second message (tool_result) structure is preserved
    const toolResultMessage = result[1];
    expect(toolResultMessage.data.message.content).toHaveLength(1);
    expect(toolResultMessage.data.message.content[0].type).toBe('tool_result');
    expect(toolResultMessage.data.message.content[0].toolUseId).toBe(
      'toolu_01M5NyE9bsGD84tzHbgpCqNG'
    );
    expect(toolResultMessage.data.message.content[0].content).toHaveLength(1);
    expect(toolResultMessage.data.message.content[0].content[0].text).toBe(
      'This is the tool result output'
    );
  });

  it('should handle responses without messages wrapper', async () => {
    // Some endpoints might return array directly
    const mockDirectArray = [
      {
        id: 'test-1',
        prompt_id: 'prompt-1',
        data: {
          message: {
            content: [{ type: 'text', text: 'Test' }],
            role: 'assistant',
          },
          type: 'assistant',
          uuid: 'uuid-1',
        },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ];

    const mockHttpClient: HttpClient = {
      get: vi.fn().mockResolvedValue({ data: mockDirectArray }),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    const client = new BackendClientImpl(mockHttpClient);
    const result = await client.messages.list('prompt-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test-1');
  });
});
