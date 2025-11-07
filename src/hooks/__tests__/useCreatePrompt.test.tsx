import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreatePrompt } from '../useMessages';
import { ApiProvider } from '../../providers/ApiProvider';
import React from 'react';

const mockClient = {
  prompts: {
    create: vi.fn(),
    list: vi.fn()
  }
} as any;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={mockClient}>
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
};

describe('useCreatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a prompt successfully', async () => {
    const mockPrompt = {
      id: 'prompt-123',
      sessionId: 'session-456',
      content: 'Hello world',
      createdAt: new Date(),
      status: 'pending' as const
    };

    mockClient.prompts.create.mockResolvedValue(mockPrompt);

    const { result } = renderHook(() => useCreatePrompt('session-456'), { wrapper });

    result.current.mutate('Hello world');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockClient.prompts.create).toHaveBeenCalledWith('session-456', 'Hello world');
    expect(result.current.data).toEqual(mockPrompt);
  });

  it('should handle errors when prompt creation fails', async () => {
    mockClient.prompts.create.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCreatePrompt('session-456'), { wrapper });

    result.current.mutate('Hello world');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Network error'));
  });
});
