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
            inbox_status: 'pending',
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
        inboxStatus: 'pending',
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

      await backendClient.sessions.list({ archived: true, parentId: 'parent-1' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/sessions', {
        params: { archived: true, parentId: 'parent-1' },
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(mockHttpClient.get).mockRejectedValue(new Error('Network error'));

      await expect(backendClient.sessions.list()).rejects.toThrow('Network error');
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
          inbox_status: 'in-progress',
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

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/sessions/session-1');
      expect(session).toMatchObject({
        id: 'session-1',
        title: 'Test Session',
        targetBranch: 'main',
        inboxStatus: 'in-progress',
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

      await expect(backendClient.sessions.get('nonexistent')).rejects.toThrow('Not found');
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
          inbox_status: 'pending',
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
        prompt: 'Create new feature',
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/sessions', {
        repo: 'test/repo',
        target_branch: 'main',
        prompt: 'Create new feature',
      });
      expect(newSession).toMatchObject({
        id: 'new-session',
        title: 'Create new feature',
        inboxStatus: 'pending',
      });
    });

    it('should handle validation errors', async () => {
      vi.mocked(mockHttpClient.post).mockRejectedValue(new Error('Invalid data'));

      await expect(
        backendClient.sessions.create({
          repo: '',
          targetBranch: 'main',
          prompt: 'Test',
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
          inbox_status: 'completed',
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
        inboxStatus: 'completed',
        prUrl: 'https://github.com/test/repo/pull/1',
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/api/sessions/session-1', {
        title: 'Updated Title',
        inbox_status: 'completed',
        pr_url: 'https://github.com/test/repo/pull/1',
      });
      expect(updated.title).toBe('Updated Title');
      expect(updated.inboxStatus).toBe('completed');
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

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/sessions/session-1');
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
          inbox_status: 'pending',
          sbx_config: null,
          parent_id: null,
          archived: true,
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockResponse);

      const archived = await backendClient.sessions.archive('session-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/sessions/session-1/archive');
      expect(archived.archived).toBe(true);
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
          inbox_status: 'pending',
          sbx_config: null,
          parent_id: null,
          archived: false,
          created_at: '2025-01-01T10:00:00Z',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockResponse);

      const unarchived = await backendClient.sessions.unarchive('session-1');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/sessions/session-1/unarchive');
      expect(unarchived.archived).toBe(false);
    });
  });

  describe('messages.list', () => {
    it('should fetch and deserialize messages', async () => {
      const mockResponse: HttpResponse<any> = {
        data: [
          {
            id: 'msg-1',
            session_id: 'session-1',
            role: 'user',
            content: 'Hello',
            created_at: '2025-01-01T10:05:00Z',
          },
          {
            id: 'msg-2',
            session_id: 'session-1',
            role: 'assistant',
            content: 'Hi there!',
            created_at: '2025-01-01T10:06:00Z',
          },
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockResponse);

      const messages = await backendClient.messages.list('session-1');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/api/sessions/session-1/messages');
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        createdAt: expect.any(Date),
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

      const message = await backendClient.messages.create('session-1', 'New message');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/sessions/session-1/messages', {
        content: 'New message',
      });
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
          inbox_status: 'pending',
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
      expect(session).toHaveProperty('inboxStatus');
      expect(session).toHaveProperty('parentId');
      expect(session).toHaveProperty('sbxConfig');
      expect(session).toHaveProperty('diffStats');
      expect(session).toHaveProperty('prUrl');
      expect(session).toHaveProperty('createdAt');
      expect(session).not.toHaveProperty('target_branch');
      expect(session).not.toHaveProperty('inbox_status');
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
          inbox_status: 'completed',
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
        inboxStatus: 'completed',
        prUrl: 'http://test.com',
      });

      expect(mockHttpClient.patch).toHaveBeenCalledWith('/api/sessions/test', {
        inbox_status: 'completed',
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
          inbox_status: 'pending',
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
