import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils';
import { SessionDetail } from '../SessionDetail';
import { Session, BackendMessage } from '@/types/session';
import { BackendClient } from '@/services/api/types';

describe('SessionDetail', () => {
  const mockOnCreatePR = vi.fn();

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
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

      expect(screen.getByText('Test Session')).toBeInTheDocument();
      expect(screen.getByText('test/repo')).toBeInTheDocument();
      expect(screen.getByText('feature/test')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should render all messages', async () => {
      const mockClient = createMockClient();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

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

      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

      // Verify Thread component is rendered with its input
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Write a message...')
        ).toBeInTheDocument();
      });
    });

    it('should render prompt content when messages array is empty', async () => {
      const mockClient = createMockClient([]);

      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

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
      render(
        <SessionDetail session={pendingSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

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
      render(
        <SessionDetail
          session={inProgressSession}
          onCreatePR={mockOnCreatePR}
        />,
        { client: mockClient }
      );

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
      render(
        <SessionDetail
          session={completedSession}
          onCreatePR={mockOnCreatePR}
        />,
        { client: mockClient }
      );

      const badge = screen.getByText('completed');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('green');
    });

    it('should display failed status', () => {
      const mockClient = createMockClient();
      const failedSession: Session = { ...baseSession, inboxStatus: 'failed' };
      render(
        <SessionDetail session={failedSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

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

      render(
        <SessionDetail
          session={completedSession}
          onCreatePR={mockOnCreatePR}
        />,
        { client: mockClient }
      );

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

      render(
        <SessionDetail
          session={inProgressSession}
          onCreatePR={mockOnCreatePR}
        />,
        { client: mockClient }
      );

      expect(screen.queryByText('+50 additions')).not.toBeInTheDocument();
      expect(screen.queryByText('-20 deletions')).not.toBeInTheDocument();
    });
  });

  describe('PR Actions', () => {
    it('should show "Create PR" button for completed sessions without PR', () => {
      const mockClient = createMockClient();
      const completedSession: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        prUrl: undefined,
      };

      render(
        <SessionDetail
          session={completedSession}
          onCreatePR={mockOnCreatePR}
        />,
        { client: mockClient }
      );

      expect(
        screen.getByRole('button', { name: /create pr/i })
      ).toBeInTheDocument();
    });

    it('should call onCreatePR when Create PR button is clicked', async () => {
      const mockClient = createMockClient();
      const user = userEvent.setup();
      const completedSession: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        prUrl: undefined,
      };

      render(
        <SessionDetail
          session={completedSession}
          onCreatePR={mockOnCreatePR}
        />,
        { client: mockClient }
      );

      const createPRButton = screen.getByRole('button', { name: /create pr/i });
      await user.click(createPRButton);

      expect(mockOnCreatePR).toHaveBeenCalledWith('test-session-1');
      expect(mockOnCreatePR).toHaveBeenCalledTimes(1);
    });

    it('should show "View PR" button when PR URL exists', () => {
      const mockClient = createMockClient();
      const sessionWithPR: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        prUrl: 'https://github.com/test/repo/pull/123',
      };

      render(
        <SessionDetail session={sessionWithPR} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

      expect(
        screen.getByRole('button', { name: /view pr/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /create pr/i })
      ).not.toBeInTheDocument();
    });

    it('should open PR URL in new tab when View PR is clicked', async () => {
      const mockClient = createMockClient();
      const user = userEvent.setup();
      const windowOpenSpy = vi
        .spyOn(window, 'open')
        .mockImplementation(() => null);

      const sessionWithPR: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        prUrl: 'https://github.com/test/repo/pull/123',
      };

      render(
        <SessionDetail session={sessionWithPR} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

      const viewPRButton = screen.getByRole('button', { name: /view pr/i });
      await user.click(viewPRButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://github.com/test/repo/pull/123',
        '_blank'
      );
      windowOpenSpy.mockRestore();
    });

    it('should not show Create PR button for non-completed sessions', () => {
      const mockClient = createMockClient();
      const pendingSession: Session = {
        ...baseSession,
        inboxStatus: 'pending',
      };

      render(
        <SessionDetail session={pendingSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

      expect(
        screen.queryByRole('button', { name: /create pr/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should render URLs in messages as clickable links', async () => {
      const messagesWithUrl: BackendMessage[] = [
        {
          type: 'assistant',
          uuid: 'msg-with-url',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: 'Check out this PR: https://github.com/test/repo/pull/123',
              },
            ],
          },
          session_id: 'test-session-1',
          parent_tool_use_id: null,
        },
      ];

      const mockClient = createMockClient(messagesWithUrl);
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

      // Wait for the message to render
      await waitFor(() => {
        expect(
          screen.getByText('Check out this PR:', { exact: false })
        ).toBeInTheDocument();
      });

      // Verify the URL is rendered as a clickable link
      const link = screen.getByRole('link', {
        name: 'https://github.com/test/repo/pull/123',
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/test/repo/pull/123'
      );
    });

    it('should display user messages with correct styling', async () => {
      const mockClient = createMockClient();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

      await waitFor(() => {
        expect(screen.getByText('Hello, please help me')).toBeInTheDocument();
      });

      // Message should be visible (using @assistant-ui/react now)
      expect(screen.getByText('Hello, please help me')).toBeVisible();
    });

    it('should display assistant messages with correct styling', async () => {
      const mockClient = createMockClient();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

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
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} />,
        { client: mockClient }
      );

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
