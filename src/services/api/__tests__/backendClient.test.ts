import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackendClientImpl } from '../backendClient';
import { HttpClient, HttpResponse } from '@/services/http/types';

describe('BackendClient API Boundaries', () => {
  let mockHttpClient: HttpClient;
  let backendClient: BackendClientImpl;

  beforeEach(() => {
    // Create a mock HTTP client
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    backendClient = new BackendClientImpl(mockHttpClient);
  });

  describe('sessions.list', () => {
    it('should fetch and deserialize sessions list', async () => {
      const mockResponse: HttpResponse<any> = {
        data: [
          {
            id: 'session-1',
            title: 'Test Session',
            repo: 'test/repo',
            branch: 'feature/test',
            target_branch: 'main',
            messages: null,
            sbx_config: null,
            parent_id: null,
            created_at: '2025-01-01T10:00:00Z',
          },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const sessions = await backendClient.sessions.list();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/sessions', {
        params: undefined,
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        id: 'session-1',
        title: 'Test Session',
        targetBranch: 'main',
        createdAt: expect.any(Date),
      });
    });

    it('should handle filter parameters', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
      });

      await backendClient.sessions.list({
        archived: true,
        parentId: 'parent-1',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/sessions', {
        params: { archived: true, parentId: 'parent-1' },
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue(
        new Error('Network error')
      );

      await expect(backendClient.sessions.list()).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('sessions.get', () => {
    it('should fetch and deserialize a single session', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'session-1',
          title: 'Test Session',
          repo: 'test/repo',
          branch: 'feature/test',
          target_branch: 'main',
          messages: [
            {
              id: 'msg-1',
              session_id: 'session-1',
              role: 'user',
              content: 'Hello',
              created_at: '2025-01-01T10:05:00Z',
            },
          ],
          sbx_config: { key: 'value' },
          parent_id: null,
          diff_stats: { additions: 10, deletions: 5 },
          pr_url: 'https://github.com/test/repo/pull/1',
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const session = await backendClient.sessions.get('session-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/sessions/session-1'
      );
      expect(session).toMatchObject({
        id: 'session-1',
        title: 'Test Session',
        targetBranch: 'main',
        diffStats: { additions: 10, deletions: 5 },
        prUrl: 'https://github.com/test/repo/pull/1',
        createdAt: expect.any(Date),
      });
      expect(session.messages).toHaveLength(1);
      expect(session.messages![0]).toMatchObject({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      });
    });

    it('should handle 404 errors', async () => {
      const error = new Error('Not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(backendClient.sessions.get('nonexistent')).rejects.toThrow(
        'Not found'
      );
    });
  });

  describe('sessions.create', () => {
    it('should create a session and deserialize response', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'new-session',
          title: 'Create new feature',
          repo: 'test/repo',
          branch: 'claude/task-123',
          target_branch: 'main',
          messages: [],
          sbx_config: null,
          parent_id: null,
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 201,
        statusText: 'Created',
        headers: {},
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockResponse);

      const newSession = await backendClient.sessions.create({
        repo: 'test/repo',
        targetBranch: 'main',
        messages: { content: 'Create new feature' },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/sessions', {
        repo: 'test/repo',
        target_branch: 'main',
        messages: { content: 'Create new feature' },
      });
      expect(newSession).toMatchObject({
        id: 'new-session',
        title: 'Create new feature',
      });
    });

    it('should handle validation errors', async () => {
      vi.mocked(mockHttpClient.post).mockRejectedValue(
        new Error('Invalid data')
      );

      await expect(
        backendClient.sessions.create({
          repo: '',
          targetBranch: 'main',
          messages: { content: 'Test' },
        })
      ).rejects.toThrow('Invalid data');
    });
  });

  describe('sessions.update', () => {
    it('should update a session', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'session-1',
          title: 'Updated Title',
          repo: 'test/repo',
          branch: 'feature/test',
          target_branch: 'main',
          messages: null,
          sbx_config: null,
          parent_id: null,
          pr_url: 'https://github.com/test/repo/pull/1',
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockResponse);

      const updated = await backendClient.sessions.update('session-1', {
        title: 'Updated Title',
        prUrl: 'https://github.com/test/repo/pull/1',
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        '/api/sessions/session-1',
        {
          title: 'Updated Title',
          pr_url: 'https://github.com/test/repo/pull/1',
        }
      );
      expect(updated.title).toBe('Updated Title');
    });
  });

  describe('sessions.delete', () => {
    it('should delete a session', async () => {
      const mockResponse: HttpResponse<void> = {
        data: undefined,
        status: 204,
        statusText: 'No Content',
        headers: {},
      };

      vi.mocked(mockHttpClient.delete).mockResolvedValue(mockResponse);

      await backendClient.sessions.delete('session-1');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        '/api/sessions/session-1'
      );
    });
  });

  describe('sessions.archive', () => {
    it('should archive a session', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'session-1',
          title: 'Test Session',
          repo: 'test/repo',
          branch: 'feature/test',
          target_branch: 'main',
          messages: null,
          sbx_config: null,
          parent_id: null,
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockResponse);

      const _archived = await backendClient.sessions.archive('session-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/sessions/session-1/archive'
      );
    });
  });

  describe('sessions.unarchive', () => {
    it('should unarchive a session', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'session-1',
          title: 'Test Session',
          repo: 'test/repo',
          branch: 'feature/test',
          target_branch: 'main',
          messages: null,
          sbx_config: null,
          parent_id: null,
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockResponse);

      const _unarchived = await backendClient.sessions.unarchive('session-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/sessions/session-1/unarchive'
      );
    });
  });

  describe('messages.list', () => {
    it('should fetch and deserialize messages', async () => {
      // BackendMessage structure (not the old simple Message structure)
      const mockResponse: HttpResponse<any> = {
        data: {
          messages: [
            {
              id: 'msg-1',
              prompt_id: 'prompt-1',
              data: {
                message: {
                  role: 'user',
                  content: [{ type: 'text', text: 'Hello' }],
                },
                type: 'user',
                uuid: 'uuid-1',
              },
              created_at: '2025-01-01T10:05:00Z',
              updated_at: '2025-01-01T10:05:00Z',
            },
            {
              id: 'msg-2',
              prompt_id: 'prompt-1',
              data: {
                message: {
                  role: 'assistant',
                  content: [{ type: 'text', text: 'Hi there!' }],
                },
                type: 'assistant',
                uuid: 'uuid-2',
              },
              created_at: '2025-01-01T10:06:00Z',
              updated_at: '2025-01-01T10:06:00Z',
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const messages = await backendClient.messages.list('prompt-1');

      // Fixed: should use /api/prompts/{promptId}/messages endpoint
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/prompts/prompt-1/messages'
      );
      expect(messages).toHaveLength(2);
      // BackendMessage structure (unwrapped from data field)
      expect(messages[0]).toMatchObject({
        type: 'user',
        uuid: 'uuid-1',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      });
    });
  });

  describe('messages.create', () => {
    it('should create a message', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'msg-new',
          session_id: 'session-1',
          role: 'user',
          content: 'New message',
          created_at: '2025-01-01T10:10:00Z',
        },
        status: 201,
        statusText: 'Created',
        headers: {},
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockResponse);

      const message = await backendClient.messages.create(
        'session-1',
        'New message'
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/sessions/session-1/messages',
        {
          content: 'New message',
        }
      );
      expect(message).toMatchObject({
        id: 'msg-new',
        content: 'New message',
        role: 'user',
      });
    });
  });

  describe('Data Serialization', () => {
    it('should properly convert snake_case to camelCase', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'test',
          target_branch: 'main',
          parent_id: 'parent',
          sbx_config: { test: true },
          diff_stats: { additions: 1, deletions: 0 },
          pr_url: 'http://test.com',
          created_at: '2025-01-01T10:00:00Z',
          repo: 'test/repo',
          branch: 'test',
          title: 'Test',
          messages: null,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const session = await backendClient.sessions.get('test');

      expect(session).toHaveProperty('targetBranch');
      expect(session).toHaveProperty('parentId');
      expect(session).toHaveProperty('sbxConfig');
      expect(session).toHaveProperty('diffStats');
      expect(session).toHaveProperty('prUrl');
      expect(session).toHaveProperty('createdAt');
      expect(session).not.toHaveProperty('target_branch');
    });

    it('should properly convert camelCase to snake_case for requests', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'test',
          title: 'Test',
          repo: 'test/repo',
          branch: 'test',
          target_branch: 'main',
          messages: null,
          sbx_config: null,
          parent_id: null,
          pr_url: 'http://test.com',
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.patch).mockResolvedValue(mockResponse);

      await backendClient.sessions.update('test', {
        prUrl: 'http://test.com',
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/api/sessions/test', {
        pr_url: 'http://test.com',
      });
    });

    it('should parse date strings to Date objects', async () => {
      const mockResponse: HttpResponse<any> = {
        data: {
          id: 'test',
          title: 'Test',
          repo: 'test/repo',
          branch: 'test',
          target_branch: 'main',
          messages: null,
          sbx_config: null,
          parent_id: null,
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const session = await backendClient.sessions.get('test');

      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.createdAt.toISOString()).toBe('2025-01-01T10:00:00.000Z');
    });
  });
});
