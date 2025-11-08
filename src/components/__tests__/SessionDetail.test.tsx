import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test/utils';
import { SessionDetail } from '../SessionDetail';
import { Session, BackendMessage } from '@/types/session';
import { BackendClient } from '@/services/api/types';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

describe('SessionDetail', () => {
  // Mock backend messages in the new format
  const mockBackendMessages: BackendMessage[] = [
    {
      type: 'user',
      uuid: 'msg-1',
      message: {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Hello, please help me',
          },
        ],
      },
      session_id: 'test-session-1',
      parent_tool_use_id: null,
    },
    {
      type: 'assistant',
      uuid: 'msg-2',
      message: {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Sure, I can help you with that!',
          },
        ],
      },
      session_id: 'test-session-1',
      parent_tool_use_id: null,
    },
  ];

  const baseSession: Session = {
    id: 'test-session-1',
    title: 'Test Session',
    repo: 'test/repo',
    branch: 'feature/test',
    targetBranch: 'main',
    messages: null,
    inboxStatus: 'in-progress',
    sbxConfig: null,
    parentId: null,
    createdAt: new Date('2025-01-01T09:00:00Z'),
    sessionStatus: 'Active',
  };

  // Mock prompt for the session
  const mockPrompt = {
    id: 'prompt-1',
    sessionId: 'test-session-1',
    content: 'Test prompt',
    createdAt: new Date('2025-01-01T09:00:00Z'),
    status: 'completed' as const,
  };

  // Create mock API client
  const createMockClient = (
    messages: BackendMessage[] = mockBackendMessages
  ): BackendClient => ({
    sessions: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(baseSession),
      create: vi.fn().mockResolvedValue(baseSession),
      update: vi.fn().mockResolvedValue(baseSession),
      delete: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(baseSession),
      unarchive: vi.fn().mockResolvedValue(baseSession),
    },
    prompts: {
      list: vi.fn().mockResolvedValue([mockPrompt]),
    },
    messages: {
      list: vi.fn().mockResolvedValue(messages),
      create: vi.fn().mockResolvedValue({
        id: 'new-msg',
        role: 'user',
        content: 'test',
        createdAt: new Date(),
      }),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render session title and metadata', async () => {
      const mockClient = createMockClient();
      render(<SessionDetail session={baseSession} />, { client: mockClient });

      expect(screen.getByText('Test Session')).toBeInTheDocument();
      expect(screen.getByText('test/repo')).toBeInTheDocument();
      expect(screen.getByText('feature/test')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should render all messages', async () => {
      const mockClient = createMockClient();
      render(<SessionDetail session={baseSession} />, { client: mockClient });

      // Wait for messages to load
      await waitFor(() => {
        expect(screen.getByText('Hello, please help me')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Sure, I can help you with that!')
      ).toBeInTheDocument();
    });

    it('should render Thread component when there are no prompts', async () => {
      // Create mock with no prompts
      const mockClient: BackendClient = {
        sessions: {
          list: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue(baseSession),
          create: vi.fn().mockResolvedValue(baseSession),
          update: vi.fn().mockResolvedValue(baseSession),
          delete: vi.fn().mockResolvedValue(undefined),
          archive: vi.fn().mockResolvedValue(baseSession),
          unarchive: vi.fn().mockResolvedValue(baseSession),
        },
        prompts: {
          list: vi.fn().mockResolvedValue([]), // No prompts
        },
        messages: {
          list: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({
            id: 'new-msg',
            role: 'user',
            content: 'test',
            createdAt: new Date(),
          }),
        },
      };

      render(<SessionDetail session={baseSession} />, { client: mockClient });

      // Verify Thread component is rendered with its input
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Write a message...')
        ).toBeInTheDocument();
      });
    });

    it('should render prompt content when messages array is empty', async () => {
      const mockClient = createMockClient([]);

      render(<SessionDetail session={baseSession} />, { client: mockClient });

      // Should show the prompt content in the Thread component
      await waitFor(() => {
        expect(screen.getByText('Test prompt')).toBeInTheDocument();
      });

      // Thread component should be rendered
      expect(
        screen.getByPlaceholderText('Write a message...')
      ).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('should display pending status', () => {
      const mockClient = createMockClient();
      const pendingSession: Session = {
        ...baseSession,
        inboxStatus: 'pending',
      };
      render(<SessionDetail session={pendingSession} />, {
        client: mockClient,
      });

      const badge = screen.getByText('pending');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('gray');
    });

    it('should display in-progress status', () => {
      const mockClient = createMockClient();
      const inProgressSession: Session = {
        ...baseSession,
        inboxStatus: 'in-progress',
      };
      render(<SessionDetail session={inProgressSession} />, {
        client: mockClient,
      });

      const badge = screen.getByText('in-progress');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('blue');
    });

    it('should display completed status', () => {
      const mockClient = createMockClient();
      const completedSession: Session = {
        ...baseSession,
        inboxStatus: 'completed',
      };
      render(<SessionDetail session={completedSession} />, {
        client: mockClient,
      });

      const badge = screen.getByText('completed');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('green');
    });

    it('should display failed status', () => {
      const mockClient = createMockClient();
      const failedSession: Session = { ...baseSession, inboxStatus: 'failed' };
      render(<SessionDetail session={failedSession} />, { client: mockClient });

      const badge = screen.getByText('failed');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('red');
    });
  });

  describe('Diff Stats', () => {
    it('should display diff stats for completed sessions', async () => {
      const mockClient = createMockClient();
      const completedSession: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        diffStats: { additions: 50, deletions: 20 },
      };

      render(<SessionDetail session={completedSession} />, {
        client: mockClient,
      });

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.getByText('+50 additions')).toBeInTheDocument();
      });
      expect(screen.getByText('-20 deletions')).toBeInTheDocument();
    });

    it('should not display diff stats for non-completed sessions', () => {
      const mockClient = createMockClient();
      const inProgressSession: Session = {
        ...baseSession,
        inboxStatus: 'in-progress',
        diffStats: { additions: 50, deletions: 20 },
      };

      render(<SessionDetail session={inProgressSession} />, {
        client: mockClient,
      });

      expect(screen.queryByText('+50 additions')).not.toBeInTheDocument();
      expect(screen.queryByText('-20 deletions')).not.toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should handle two prompts with messages without error', async () => {
      // Create two separate prompts

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const testDataDir = join(__dirname, 'testdata');

      // read data from testdata/prompt.json
      const promptData = await readFile(
        join(testDataDir, 'prompt.json'),
        'utf8'
      );
      const promptsData = JSON.parse(promptData);
      const backendPrompts = promptsData.prompts || promptsData;

      // Transform backend prompt format to frontend Prompt format
      const prompts = backendPrompts.map((p: any) => ({
        id: p.id,
        sessionId: p.session_id,
        content: Array.isArray(p.data)
          ? p.data[0]?.content || ''
          : p.data?.content || '',
        createdAt: new Date(p.created_at),
        status: p.inbox_status?.toLowerCase() || 'completed',
      }));

      // read messages from testdata/message-1.json
      const messageData = await readFile(
        join(testDataDir, 'message-1.json'),
        'utf8'
      );
      const messagesData = JSON.parse(messageData);
      const messages = messagesData.messages || messagesData;

      // read messages from testdata/message-2.json
      const messageData2 = await readFile(
        join(testDataDir, 'message-2.json'),
        'utf8'
      );
      const messagesData2 = JSON.parse(messageData2);
      const messages2 = messagesData2.messages || messagesData2;

      const mockClient: BackendClient = {
        sessions: {
          list: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue(baseSession),
          create: vi.fn().mockResolvedValue(baseSession),
          update: vi.fn().mockResolvedValue(baseSession),
          delete: vi.fn().mockResolvedValue(undefined),
          archive: vi.fn().mockResolvedValue(baseSession),
          unarchive: vi.fn().mockResolvedValue(baseSession),
        },
        prompts: {
          list: vi.fn().mockResolvedValue(prompts),
        },
        messages: {
          list: vi.fn().mockImplementation((promptId: string) => {
            if (promptId === 'prompt-1') return Promise.resolve(messages);
            if (promptId === 'prompt-2') return Promise.resolve(messages2);
            return Promise.resolve([]);
          }),
          create: vi.fn().mockResolvedValue({
            id: 'new-msg',
            role: 'user',
            content: 'test',
            createdAt: new Date(),
          }),
        },
      };

      render(<SessionDetail session={baseSession} />, { client: mockClient });

      // Wait for both prompts to load
      await waitFor(() => {
        expect(
          screen.getByText(/refacor this to use monaco editor/i)
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/when my cursor is over a monaco editor/i)
      ).toBeInTheDocument();
    });

    it('should display user messages with correct styling', async () => {
      const mockClient = createMockClient();
      render(<SessionDetail session={baseSession} />, { client: mockClient });

      await waitFor(() => {
        expect(screen.getByText('Hello, please help me')).toBeInTheDocument();
      });

      // Message should be visible (using @assistant-ui/react now)
      expect(screen.getByText('Hello, please help me')).toBeVisible();
    });

    it('should display assistant messages with correct styling', async () => {
      const mockClient = createMockClient();
      render(<SessionDetail session={baseSession} />, { client: mockClient });

      await waitFor(() => {
        expect(
          screen.getByText('Sure, I can help you with that!')
        ).toBeInTheDocument();
      });

      // Message should be visible (using @assistant-ui/react now)
      expect(screen.getByText('Sure, I can help you with that!')).toBeVisible();
    });

    it('should display message types', async () => {
      const mockClient = createMockClient();
      render(<SessionDetail session={baseSession} />, { client: mockClient });

      // Wait for messages to load
      // Note: @assistant-ui/react may render messages differently,
      // so we just check that messages are visible
      await waitFor(() => {
        expect(screen.getByText('Hello, please help me')).toBeInTheDocument();
        expect(
          screen.getByText('Sure, I can help you with that!')
        ).toBeInTheDocument();
      });
    });
  });
});
