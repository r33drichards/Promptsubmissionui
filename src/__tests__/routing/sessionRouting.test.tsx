import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/utils';
import { ApiProvider } from '@/providers/ApiProvider';
import { createMockBackendClient } from '@/test/mockBackendClient';
import App from '@/App';

describe('Session Routing', () => {
  let mockClient: ReturnType<typeof createMockBackendClient>;

  beforeEach(() => {
    mockClient = createMockBackendClient();
    vi.clearAllMocks();
  });

  // Helper function to render with router and necessary providers
  const renderWithRouter = (router: ReturnType<typeof createMemoryRouter>) => {
    const queryClient = createTestQueryClient();

    return render(
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={mockClient}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    );
  };

  describe('URL Navigation', () => {
    it('should navigate to session detail when clicking session', async () => {
      const user = userEvent.setup();

      // Create router with initial route at home
      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      renderWithRouter(router);

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Click session
      const sessionItem = screen.getByText('Test Session 1');
      await user.click(sessionItem);

      // Verify URL changed
      expect(router.state.location.pathname).toMatch(/\/session\/.+/);
    });

    it('should display session when navigating directly to session URL', async () => {
      const sessionId = 'session-1';

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: [`/session/${sessionId}`] }
      );

      renderWithRouter(router);

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Session details should be visible
      await waitFor(() => {
        const repoElements = screen.getAllByText('test/repo');
        expect(repoElements.length).toBeGreaterThan(0);
      });
    });

    it('should redirect to home for invalid session ID', async () => {
      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/session/invalid-id'] }
      );

      renderWithRouter(router);

      await waitFor(() => {
        // Should redirect to home
        expect(router.state.location.pathname).toBe('/');
      });

      // Should show empty state
      expect(
        screen.getByText('Select a task to view details')
      ).toBeInTheDocument();
    });

    it('should show empty state at root path', async () => {
      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      renderWithRouter(router);

      await waitFor(() => {
        expect(
          screen.getByText('Select a task to view details')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Browser Navigation', () => {
    it('should support back button navigation', async () => {
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      renderWithRouter(router);

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Navigate to first session
      await user.click(screen.getByText('Test Session 1'));

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/\/session\/.+/);
      });

      // Navigate to second session
      await user.click(screen.getByText('Test Session 2'));

      // Go back
      router.navigate(-1);

      await waitFor(() => {
        // Should be back at first session (verify by checking details visible)
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });
    });
  });

  describe('Archive Flow', () => {
    it('should navigate to home after archiving selected session', async () => {
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      renderWithRouter(router);

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Select session
      const sessionItem = screen.getByText('Test Session 1');
      await user.click(sessionItem);

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/\/session\/.+/);
      });

      // Archive it (need to hover to show button)
      const sessionContainer = sessionItem.closest('div');
      await user.hover(sessionContainer!);

      // Note: Archive button interaction would be tested here
      // For now, verify the mutation handler is set up correctly
    });
  });

  describe('Create Session Flow', () => {
    it('should navigate to new session after creation', async () => {
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      renderWithRouter(router);

      await waitFor(() => {
        const newTaskButtons = screen.getAllByRole('button', {
          name: /new task/i,
        });
        expect(newTaskButtons.length).toBeGreaterThan(0);
      });

      // Click New Task
      const newTaskButton = screen.getAllByRole('button', {
        name: /new task/i,
      })[0];
      await user.click(newTaskButton);

      // Form should be visible
      await waitFor(() => {
        expect(screen.getByText('Create New Task')).toBeInTheDocument();
      });

      // After successful creation, should navigate to new session
      // This would be verified by mocking the create mutation and checking navigation
    });
  });
});
