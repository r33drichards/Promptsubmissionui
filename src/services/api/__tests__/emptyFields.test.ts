import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptBackendClient } from '../promptBackendClient';

describe('PromptBackendClient - Empty Fields Handling', () => {
  let client: PromptBackendClient;

  beforeEach(() => {
    client = new PromptBackendClient('http://localhost:8000');
  });

  it('should throw error when repo is empty string', async () => {
    await expect(
      client.sessions.create({
        repo: '',
        targetBranch: 'main',
        messages: { content: 'test' },
        parentId: null,
      })
    ).rejects.toThrow('Repository is required to create a session');
  });

  it('should throw error when targetBranch is empty string', async () => {
    await expect(
      client.sessions.create({
        repo: 'test/repo',
        targetBranch: '',
        messages: { content: 'test' },
        parentId: null,
      })
    ).rejects.toThrow('Target branch is required to create a session');
  });

  it('should throw error when repo is only whitespace', async () => {
    await expect(
      client.sessions.create({
        repo: '   ',
        targetBranch: 'main',
        messages: { content: 'test' },
        parentId: null,
      })
    ).rejects.toThrow('Repository is required to create a session');
  });

  it('should show what the SDK sends when both fields are empty', async () => {
    // This test documents what happens when empty strings are passed
    // The SDK should filter them out, resulting in a request with only messages and parent
    const mockApi = {
      handlersSessionsCreate: vi.fn().mockResolvedValue({ id: 'test-id' }),
      handlersSessionsRead: vi.fn().mockResolvedValue({
        session: {
          id: 'test-id',
          title: 'Test',
          repo: '',
          branch: '',
          targetBranch: '',
          messages: null,
          inboxStatus: 'Pending',
          sbxConfig: null,
          parent: null,
          createdAt: new Date().toISOString(),
          sessionStatus: 'Active',
        },
      }),
    };

    // @ts-expect-error - Mocking private api property
    client.api = mockApi;

    try {
      await client.sessions.create({
        repo: '',
        targetBranch: '',
        messages: { content: 'test' },
        parentId: null,
      });
    } catch (error) {
      // Should throw validation error before calling API
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/required/i);
    }

    // API should NOT have been called due to validation
    expect(mockApi.handlersSessionsCreate).not.toHaveBeenCalled();
  });
});
