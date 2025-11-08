import { vi } from 'vitest';
import { BackendClient } from '@/services/api/types';
import { Session, Message } from '@/types/session';

/**
 * Creates a mock BackendClient for testing
 * All methods are vi.fn() so they can be spied on and have custom implementations
 */
export function createMockBackendClient(
  overrides?: Partial<BackendClient>
): BackendClient {
  const mockSessions: Session[] = [
    {
      id: 'test-session-1',
      title: 'Test Session 1',
      repo: 'test/repo',
      branch: 'feature/test',
      targetBranch: 'main',
      messages: null,
      inboxStatus: 'in-progress',
      uiStatus: 'NeedsReview',
      sbxConfig: null,
      parentId: null,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      sessionStatus: 'Active',
    },
    {
      id: 'test-session-2',
      title: 'Test Session 2',
      repo: 'test/repo',
      branch: 'feature/test-2',
      targetBranch: 'main',
      messages: null,
      inboxStatus: 'in-progress',
      uiStatus: 'NeedsReview',
      sbxConfig: null,
      parentId: null,
      createdAt: new Date('2025-01-02T10:00:00Z'),
      sessionStatus: 'Active',
      diffStats: { additions: 10, deletions: 5 },
    },
    {
      id: 'test-session-3',
      title: 'Test Session 3 (Completed)',
      repo: 'test/another-repo',
      branch: 'feature/completed',
      targetBranch: 'main',
      messages: null,
      inboxStatus: 'completed',
      uiStatus: 'NeedsReview',
      sbxConfig: null,
      parentId: null,
      createdAt: new Date('2025-01-03T10:00:00Z'),
      sessionStatus: 'Active',
      diffStats: { additions: 25, deletions: 8 },
      prUrl: 'https://github.com/test/repo/pull/123',
    },
  ];

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Test user message',
      createdAt: new Date('2025-01-01T10:05:00Z'),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Test assistant response',
      createdAt: new Date('2025-01-01T10:06:00Z'),
    },
  ];

  const defaultClient: BackendClient = {
    sessions: {
      list: vi.fn().mockResolvedValue(mockSessions),
      get: vi.fn().mockImplementation((id: string) => {
        const session = mockSessions.find((s) => s.id === id);
        if (!session) {
          return Promise.reject(new Error('Session not found'));
        }
        return Promise.resolve(session);
      }),
      create: vi.fn().mockImplementation((data) => {
        const newSession: Session = {
          id: `test-session-${Date.now()}`,
          title: data.title,
          repo: data.repo,
          branch: data.branch,
          targetBranch: data.targetBranch,
          messages: [],
          inboxStatus: 'pending',
          uiStatus: 'Pending',
          sbxConfig: data.sbxConfig || null,
          parentId: data.parentId || null,
          createdAt: new Date(),
          sessionStatus: 'Active',
        };
        return Promise.resolve(newSession);
      }),
      update: vi.fn().mockImplementation((id: string, data) => {
        const session = mockSessions.find((s) => s.id === id);
        if (!session) {
          return Promise.reject(new Error('Session not found'));
        }
        const updated = { ...session, ...data };
        return Promise.resolve(updated);
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockImplementation((id: string) => {
        const session = mockSessions.find((s) => s.id === id);
        if (!session) {
          return Promise.reject(new Error('Session not found'));
        }
        return Promise.resolve({
          ...session,
          sessionStatus: 'Archived' as const,
        });
      }),
      unarchive: vi.fn().mockImplementation((id: string) => {
        const session = mockSessions.find((s) => s.id === id);
        if (!session) {
          return Promise.reject(new Error('Session not found'));
        }
        return Promise.resolve({
          ...session,
          sessionStatus: 'Active' as const,
        });
      }),
    },
    prompts: {
      list: vi.fn().mockResolvedValue([]),
      create: vi
        .fn()
        .mockImplementation((sessionId: string, content: string) => {
          return Promise.resolve({
            id: `prompt-${Date.now()}`,
            sessionId,
            content,
            createdAt: new Date(),
            status: 'pending' as const,
          });
        }),
    },
    messages: {
      list: vi.fn().mockResolvedValue(mockMessages),
      create: vi
        .fn()
        .mockImplementation((sessionId: string, content: string) => {
          const newMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            createdAt: new Date(),
          };
          return Promise.resolve(newMessage);
        }),
    },
  };

  return {
    sessions: {
      ...defaultClient.sessions,
      ...overrides?.sessions,
    },
    prompts: {
      ...defaultClient.prompts,
      ...overrides?.prompts,
    },
    messages: {
      ...defaultClient.messages,
      ...overrides?.messages,
    },
  };
}

/**
 * Creates a mock BackendClient that simulates errors
 */
export function createErrorMockBackendClient(): BackendClient {
  return {
    sessions: {
      list: vi.fn().mockRejectedValue(new Error('Failed to fetch sessions')),
      get: vi.fn().mockRejectedValue(new Error('Failed to fetch session')),
      create: vi.fn().mockRejectedValue(new Error('Failed to create session')),
      update: vi.fn().mockRejectedValue(new Error('Failed to update session')),
      delete: vi.fn().mockRejectedValue(new Error('Failed to delete session')),
      archive: vi
        .fn()
        .mockRejectedValue(new Error('Failed to archive session')),
      unarchive: vi
        .fn()
        .mockRejectedValue(new Error('Failed to unarchive session')),
    },
    prompts: {
      list: vi.fn().mockRejectedValue(new Error('Failed to fetch prompts')),
      create: vi.fn().mockRejectedValue(new Error('Failed to create prompt')),
    },
    messages: {
      list: vi.fn().mockRejectedValue(new Error('Failed to fetch messages')),
      create: vi.fn().mockRejectedValue(new Error('Failed to create message')),
    },
  };
}
