import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptBackendClient } from '../promptBackendClient';
import { DefaultApi } from '@wholelottahoopla/prompt-backend-client';

vi.mock('@wholelottahoopla/prompt-backend-client');

describe('PromptBackendClient.prompts.create', () => {
  let client: PromptBackendClient;
  let mockApi: DefaultApi;

  beforeEach(() => {
    mockApi = new DefaultApi() as any;
    client = new PromptBackendClient();
    (client as any).api = mockApi;
  });

  it('should create a prompt with message content', async () => {
    const mockPrompt = {
      id: 'prompt-123',
      sessionId: 'session-456',
      content: 'Hello world',
      created_at: '2025-11-06T00:00:00Z',
      data: [{ content: 'Hello world', type: 'text' }],
    };

    mockApi.handlersPromptsCreate = vi.fn().mockResolvedValue({
      prompt: mockPrompt,
    });

    const result = await client.prompts.create('session-456', 'Hello world');

    expect(mockApi.handlersPromptsCreate).toHaveBeenCalledWith({
      createPromptInput: {
        sessionId: 'session-456',
        data: [{ content: 'Hello world', type: 'text' }],
      },
    });

    expect(result).toEqual({
      id: 'prompt-123',
      sessionId: 'session-456',
      content: 'Hello world',
      createdAt: expect.any(Date),
      status: 'pending',
    });
  });
});
