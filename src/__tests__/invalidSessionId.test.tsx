import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { createMockBackendClient } from '@/test/mockBackendClient';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/utils';
import { ApiProvider } from '@/providers/ApiProvider';
import App from '@/App';
import { toast } from 'sonner';
import { render as rtlRender } from '@testing-library/react';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}));

describe('Invalid Session ID Handling', () => {
  let mockClient: ReturnType<typeof createMockBackendClient>;

  beforeEach(() => {
    mockClient = createMockBackendClient();
    vi.clearAllMocks();
  });

  it('should redirect to home and show error toast for invalid session ID', async () => {
    const router = createMemoryRouter(
      [
        { path: '/', element: <App /> },
        { path: '/session/:id', element: <App /> },
      ],
      { initialEntries: ['/session/invalid-session-id-12345'] }
    );

    const queryClient = createTestQueryClient();

    rtlRender(
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={mockClient}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    );

    // Wait for sessions to load
    await waitFor(() => {
      expect(mockClient.sessions.list).toHaveBeenCalled();
    });

    // Should redirect to home
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    }, { timeout: 3000 });

    // Should show error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Session not found');
    });

    // Should show empty state
    expect(screen.getByText('Select a task to view details')).toBeInTheDocument();
  });

  it('should load valid session ID correctly', async () => {
    const router = createMemoryRouter(
      [
        { path: '/', element: <App /> },
        { path: '/session/:id', element: <App /> },
      ],
      { initialEntries: ['/session/test-session-1'] }
    );

    const queryClient = createTestQueryClient();

    rtlRender(
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={mockClient}>
          <RouterProvider router={router} />
        </ApiProvider>
      </QueryClientProvider>
    );

    // Wait for sessions to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Session 1').length).toBeGreaterThan(0);
    });

    // Should stay on session route
    expect(router.state.location.pathname).toBe('/session/test-session-1');

    // Should display session details
    await waitFor(() => {
      const repoElements = screen.getAllByText('test/repo');
      expect(repoElements.length).toBeGreaterThan(0);
    });

    // Should NOT show error toast
    expect(toast.error).not.toHaveBeenCalled();
  });
});
