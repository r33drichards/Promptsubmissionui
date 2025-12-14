import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { createMockBackendClient } from '@/test/mockBackendClient';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/utils';
import { ApiProvider } from '@/providers/ApiProvider';
import App from '@/App';
import { toast } from 'sonner';
import { render as rtlRender } from '@testing-library/react';
import { Session } from '@/types/session';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}));

describe('Stop Session Functionality', () => {
  let mockClient: ReturnType<typeof createMockBackendClient>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show stop button when session is InProgress', async () => {
    // Create a session with InProgress status
    const inProgressSession: Session = {
      id: 'in-progress-session',
      title: 'Running Session',
      repo: 'test/repo',
      branch: 'feature/running',
      targetBranch: 'main',
      messages: null,
      uiStatus: 'InProgress',
      sbxConfig: { borrow_token: 'test-token' },
      parentId: null,
      createdAt: new Date(),
    };

    mockClient = createMockBackendClient();
    mockClient.sessions.list = vi.fn().mockResolvedValue([inProgressSession]);
    mockClient.sessions.get = vi.fn().mockResolvedValue(inProgressSession);
    mockClient.sessions.stop = vi.fn().mockResolvedValue(undefined);

    const router = createMemoryRouter(
      [
        { path: '/', element: <App /> },
        { path: '/session/:id', element: <App /> },
      ],
      { initialEntries: ['/session/in-progress-session'] }
    );

    const queryClient = createTestQueryClient();

    rtlRender(
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={mockClient}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    );

    // Wait for the session to load
    await waitFor(() => {
      expect(screen.getAllByText('Running Session').length).toBeGreaterThan(0);
    });

    // Stop button should be visible for InProgress sessions
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });
  });

  it('should NOT show stop button when session is not InProgress', async () => {
    // Create a session with NeedsReview status (not running)
    const completedSession: Session = {
      id: 'completed-session',
      title: 'Completed Session',
      repo: 'test/repo',
      branch: 'feature/done',
      targetBranch: 'main',
      messages: null,
      uiStatus: 'NeedsReview',
      sbxConfig: null,
      parentId: null,
      createdAt: new Date(),
    };

    mockClient = createMockBackendClient();
    mockClient.sessions.list = vi.fn().mockResolvedValue([completedSession]);
    mockClient.sessions.get = vi.fn().mockResolvedValue(completedSession);

    const router = createMemoryRouter(
      [
        { path: '/', element: <App /> },
        { path: '/session/:id', element: <App /> },
      ],
      { initialEntries: ['/session/completed-session'] }
    );

    const queryClient = createTestQueryClient();

    rtlRender(
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={mockClient}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    );

    // Wait for the session to load - use getAllByText since title appears in multiple places
    await waitFor(() => {
      expect(screen.getAllByText('Completed Session').length).toBeGreaterThan(
        0
      );
    });

    // Stop button should NOT be visible for completed sessions
    expect(
      screen.queryByRole('button', { name: /stop/i })
    ).not.toBeInTheDocument();
  });

  it('should call stop endpoint when stop button is clicked', async () => {
    const inProgressSession: Session = {
      id: 'in-progress-session',
      title: 'Running Session',
      repo: 'test/repo',
      branch: 'feature/running',
      targetBranch: 'main',
      messages: null,
      uiStatus: 'InProgress',
      sbxConfig: { borrow_token: 'test-token' },
      parentId: null,
      createdAt: new Date(),
    };

    const stopMock = vi.fn().mockResolvedValue(undefined);

    mockClient = createMockBackendClient();
    mockClient.sessions.list = vi.fn().mockResolvedValue([inProgressSession]);
    mockClient.sessions.get = vi.fn().mockResolvedValue(inProgressSession);
    mockClient.sessions.stop = stopMock;

    const router = createMemoryRouter(
      [
        { path: '/', element: <App /> },
        { path: '/session/:id', element: <App /> },
      ],
      { initialEntries: ['/session/in-progress-session'] }
    );

    const queryClient = createTestQueryClient();

    rtlRender(
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={mockClient}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    );

    // Wait for the session to load and stop button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    // Click the stop button
    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    // Verify the stop endpoint was called with the session ID
    await waitFor(() => {
      expect(stopMock).toHaveBeenCalledWith('in-progress-session');
    });

    // Should show success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Session stopped');
    });
  });

  it('should show error toast when stop fails', async () => {
    const inProgressSession: Session = {
      id: 'in-progress-session',
      title: 'Running Session',
      repo: 'test/repo',
      branch: 'feature/running',
      targetBranch: 'main',
      messages: null,
      uiStatus: 'InProgress',
      sbxConfig: { borrow_token: 'test-token' },
      parentId: null,
      createdAt: new Date(),
    };

    const stopMock = vi
      .fn()
      .mockRejectedValue(new Error('Failed to stop session'));

    mockClient = createMockBackendClient();
    mockClient.sessions.list = vi.fn().mockResolvedValue([inProgressSession]);
    mockClient.sessions.get = vi.fn().mockResolvedValue(inProgressSession);
    mockClient.sessions.stop = stopMock;

    const router = createMemoryRouter(
      [
        { path: '/', element: <App /> },
        { path: '/session/:id', element: <App /> },
      ],
      { initialEntries: ['/session/in-progress-session'] }
    );

    const queryClient = createTestQueryClient();

    rtlRender(
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={mockClient}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    );

    // Wait for the session to load and stop button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    });

    // Click the stop button
    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    // Should show error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to stop session');
    });
  });
});
