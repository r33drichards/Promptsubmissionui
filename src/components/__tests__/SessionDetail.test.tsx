import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils';
import { SessionDetail } from '../SessionDetail';
import { Session } from '@/types/session';

describe('SessionDetail', () => {
  const mockOnCreatePR = vi.fn();
  const mockOnReply = vi.fn();

  const baseSession: Session = {
    id: 'test-session-1',
    title: 'Test Session',
    repo: 'test/repo',
    branch: 'feature/test',
    targetBranch: 'main',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, please help me',
        timestamp: new Date('2025-01-01T10:00:00Z'),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Sure, I can help you with that!',
        timestamp: new Date('2025-01-01T10:01:00Z'),
      },
    ],
    inboxStatus: 'in-progress',
    sbxConfig: null,
    parentId: null,
    createdAt: new Date('2025-01-01T09:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render session title and metadata', () => {
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      expect(screen.getByText('Test Session')).toBeInTheDocument();
      expect(screen.getByText('test/repo')).toBeInTheDocument();
      expect(screen.getByText('feature/test')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should render all messages', () => {
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      expect(screen.getByText('Hello, please help me')).toBeInTheDocument();
      expect(screen.getByText('Sure, I can help you with that!')).toBeInTheDocument();
      expect(screen.getAllByText('You')).toHaveLength(1);
      expect(screen.getAllByText('Assistant')).toHaveLength(1);
    });

    it('should show "No messages yet" when messages is null', () => {
      const sessionWithoutMessages: Session = {
        ...baseSession,
        messages: null,
      };

      render(
        <SessionDetail
          session={sessionWithoutMessages}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('should show "No messages yet" when messages array is empty', () => {
      const sessionWithEmptyMessages: Session = {
        ...baseSession,
        messages: [],
      };

      render(
        <SessionDetail
          session={sessionWithEmptyMessages}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('should display pending status', () => {
      const pendingSession: Session = { ...baseSession, inboxStatus: 'pending' };
      render(
        <SessionDetail
          session={pendingSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      const badge = screen.getByText('pending');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('gray');
    });

    it('should display in-progress status', () => {
      const inProgressSession: Session = { ...baseSession, inboxStatus: 'in-progress' };
      render(
        <SessionDetail
          session={inProgressSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      const badge = screen.getByText('in-progress');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('blue');
    });

    it('should display completed status', () => {
      const completedSession: Session = { ...baseSession, inboxStatus: 'completed' };
      render(
        <SessionDetail
          session={completedSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      const badge = screen.getByText('completed');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('green');
    });

    it('should display failed status', () => {
      const failedSession: Session = { ...baseSession, inboxStatus: 'failed' };
      render(
        <SessionDetail
          session={failedSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      const badge = screen.getByText('failed');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('red');
    });
  });

  describe('Diff Stats', () => {
    it('should display diff stats for completed sessions', () => {
      const completedSession: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        diffStats: { additions: 50, deletions: 20 },
      };

      render(
        <SessionDetail
          session={completedSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      expect(screen.getByText('+50 additions')).toBeInTheDocument();
      expect(screen.getByText('-20 deletions')).toBeInTheDocument();
    });

    it('should not display diff stats for non-completed sessions', () => {
      const inProgressSession: Session = {
        ...baseSession,
        inboxStatus: 'in-progress',
        diffStats: { additions: 50, deletions: 20 },
      };

      render(
        <SessionDetail
          session={inProgressSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      expect(screen.queryByText('+50 additions')).not.toBeInTheDocument();
      expect(screen.queryByText('-20 deletions')).not.toBeInTheDocument();
    });
  });

  describe('PR Actions', () => {
    it('should show "Create PR" button for completed sessions without PR', () => {
      const completedSession: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        prUrl: undefined,
      };

      render(
        <SessionDetail
          session={completedSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      expect(screen.getByRole('button', { name: /create pr/i })).toBeInTheDocument();
    });

    it('should call onCreatePR when Create PR button is clicked', async () => {
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
          onReply={mockOnReply}
        />
      );

      const createPRButton = screen.getByRole('button', { name: /create pr/i });
      await user.click(createPRButton);

      expect(mockOnCreatePR).toHaveBeenCalledWith('test-session-1');
      expect(mockOnCreatePR).toHaveBeenCalledTimes(1);
    });

    it('should show "View PR" button when PR URL exists', () => {
      const sessionWithPR: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        prUrl: 'https://github.com/test/repo/pull/123',
      };

      render(
        <SessionDetail
          session={sessionWithPR}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      expect(screen.getByRole('button', { name: /view pr/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create pr/i })).not.toBeInTheDocument();
    });

    it('should open PR URL in new tab when View PR is clicked', async () => {
      const user = userEvent.setup();
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      const sessionWithPR: Session = {
        ...baseSession,
        inboxStatus: 'completed',
        prUrl: 'https://github.com/test/repo/pull/123',
      };

      render(
        <SessionDetail
          session={sessionWithPR}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      const viewPRButton = screen.getByRole('button', { name: /view pr/i });
      await user.click(viewPRButton);

      expect(windowOpenSpy).toHaveBeenCalledWith('https://github.com/test/repo/pull/123', '_blank');
      windowOpenSpy.mockRestore();
    });

    it('should not show Create PR button for non-completed sessions', () => {
      const pendingSession: Session = {
        ...baseSession,
        inboxStatus: 'pending',
      };

      render(
        <SessionDetail
          session={pendingSession}
          onCreatePR={mockOnCreatePR}
          onReply={mockOnReply}
        />
      );

      expect(screen.queryByRole('button', { name: /create pr/i })).not.toBeInTheDocument();
    });
  });

  describe('Reply Functionality', () => {
    it('should render reply textarea and send button', () => {
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      expect(screen.getByPlaceholderText(/reply/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should update reply textarea value as user types', async () => {
      const user = userEvent.setup();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const replyTextarea = screen.getByPlaceholderText(/reply/i) as HTMLTextAreaElement;
      await user.type(replyTextarea, 'My reply message');

      expect(replyTextarea.value).toBe('My reply message');
    });

    it('should call onReply when send button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const replyTextarea = screen.getByPlaceholderText(/reply/i);
      await user.type(replyTextarea, 'My reply message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnReply).toHaveBeenCalledWith('test-session-1', 'My reply message');
    });

    it('should clear reply textarea after sending', async () => {
      const user = userEvent.setup();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const replyTextarea = screen.getByPlaceholderText(/reply/i) as HTMLTextAreaElement;
      await user.type(replyTextarea, 'My reply message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(replyTextarea.value).toBe('');
    });

    it('should disable send button when reply is empty', () => {
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when reply contains only whitespace', async () => {
      const user = userEvent.setup();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const replyTextarea = screen.getByPlaceholderText(/reply/i);
      await user.type(replyTextarea, '   ');

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('should send reply when Cmd+Enter is pressed', async () => {
      const user = userEvent.setup();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const replyTextarea = screen.getByPlaceholderText(/reply/i);
      await user.type(replyTextarea, 'My reply message');
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      expect(mockOnReply).toHaveBeenCalledWith('test-session-1', 'My reply message');
    });

    it('should send reply when Ctrl+Enter is pressed', async () => {
      const user = userEvent.setup();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const replyTextarea = screen.getByPlaceholderText(/reply/i);
      await user.type(replyTextarea, 'My reply message');
      await user.keyboard('{Control>}{Enter}{/Control}');

      expect(mockOnReply).toHaveBeenCalledWith('test-session-1', 'My reply message');
    });

    it('should not send reply when Enter is pressed without modifier key', async () => {
      const user = userEvent.setup();
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const replyTextarea = screen.getByPlaceholderText(/reply/i);
      await user.type(replyTextarea, 'My reply message{Enter}');

      // Reply should not be sent, just a newline added
      expect(mockOnReply).not.toHaveBeenCalled();
    });
  });

  describe('Message Display', () => {
    it('should display user messages with correct styling', () => {
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const userMessage = screen.getByText('Hello, please help me').closest('div');
      expect(userMessage?.className).toContain('bg-gray-50');
    });

    it('should display assistant messages with correct styling', () => {
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      const assistantMessage = screen
        .getByText('Sure, I can help you with that!')
        .closest('div');
      expect(assistantMessage?.className).toContain('bg-blue-50');
    });

    it('should display message timestamps', () => {
      render(
        <SessionDetail session={baseSession} onCreatePR={mockOnCreatePR} onReply={mockOnReply} />
      );

      // Check that timestamps are displayed (exact format may vary by locale)
      const timestamps = screen.getAllByText(/1\/1\/2025/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });
});
