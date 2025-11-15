// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssistantRuntime } from '../useAssistantRuntime';
import { ApiProvider } from '../../providers/ApiProvider';
import React from 'react';

const mockMutateAsync = vi.fn();

vi.mock('../useMessages', () => ({
  useCreatePrompt: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

// Mock @assistant-ui/react to return a simple runtime for testing
vi.mock('@assistant-ui/react', async () => {
  const actual = await vi.importActual('@assistant-ui/react');
  return {
    ...actual,
    useExternalStoreRuntime: (adapter: any) => {
      // Return the adapter itself for testing purposes
      return { adapter };
    },
  };
});

const mockClient = {} as any;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={mockClient}>{children}</ApiProvider>
    </QueryClientProvider>
  );
};

describe('useAssistantRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call createPrompt when onNew is triggered with text content', async () => {
    mockMutateAsync.mockResolvedValue({});

    const { result } = renderHook(
      () => useAssistantRuntime('session-123', [], false),
      { wrapper }
    );

    const message = {
      content: [{ type: 'text' as const, text: 'Hello world' }],
    };

    // Call the onNew handler directly
    await result.current.adapter.onNew(message);

    expect(mockMutateAsync).toHaveBeenCalledWith('Hello world');
  });

  it('should not call createPrompt when content is empty', async () => {
    const { result } = renderHook(
      () => useAssistantRuntime('session-123', [], false),
      { wrapper }
    );

    const message = {
      content: [{ type: 'text' as const, text: '' }],
    };

    // Call the onNew handler directly
    await result.current.adapter.onNew(message);

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('should not call createPrompt when content is only whitespace', async () => {
    const { result } = renderHook(
      () => useAssistantRuntime('session-123', [], false),
      { wrapper }
    );

    const message = {
      content: [{ type: 'text' as const, text: '   ' }],
    };

    // Call the onNew handler directly
    await result.current.adapter.onNew(message);

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
