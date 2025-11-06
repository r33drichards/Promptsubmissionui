import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { TestProviders, createTestQueryClient } from '@/test/utils';
import { useSessionConversation, useMessages, usePrompts } from '../useMessages';
import { BackendClient } from '@/services/api/types';
import {
  mockSession,
  mockPrompts,
  mockBackendMessages,
  mockEmptyMessages,
  mockEmptyPrompts,
  mockComplexMessages,
  mockSystemMessage,
} from '@/test/mockData';
import { ReactNode } from 'react';

describe('useSessionConversation', () => {
  let mockClient: BackendClient;
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockClient = {
      sessions: {
        list: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(mockSession),
        create: vi.fn().mockResolvedValue(mockSession),
        update: vi.fn().mockResolvedValue(mockSession),
        delete: vi.fn().mockResolvedValue(undefined),
        archive: vi.fn().mockResolvedValue(mockSession),
        unarchive: vi.fn().mockResolvedValue(mockSession),
      },
      prompts: {
        list: vi.fn().mockResolvedValue(mockPrompts),
      },
      messages: {
        list: vi.fn().mockResolvedValue(mockBackendMessages),
        create: vi.fn().mockResolvedValue({
          id: 'new-msg',
          role: 'user',
          content: 'test',
          createdAt: new Date(),
        }),
      },
    };
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders client={mockClient} queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  describe('Hook Integration', () => {
    it('should fetch both messages and prompts for a session', async () => {
      const { result } = renderHook(() => useSessionConversation('session-123'), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toHaveLength(mockBackendMessages.length);
      expect(result.current.prompts).toHaveLength(mockPrompts.length);
      expect(mockClient.messages.list).toHaveBeenCalledWith('session-123');
      expect(mockClient.prompts.list).toHaveBeenCalledWith('session-123');
    });

    it('should return empty arrays when no messages or prompts exist', async () => {
      mockClient.messages.list = vi.fn().mockResolvedValue(mockEmptyMessages);
      mockClient.prompts.list = vi.fn().mockResolvedValue(mockEmptyPrompts);

      const { result } = renderHook(() => useSessionConversation('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.prompts).toHaveLength(0);
    });

    it('should handle session ID changes', async () => {
      const { result, rerender } = renderHook(
        ({ sessionId }) => useSessionConversation(sessionId),
        {
          wrapper,
          initialProps: { sessionId: 'session-123' },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockClient.messages.list).toHaveBeenCalledWith('session-123');

      // Change session ID
      mockClient.messages.list = vi.fn().mockResolvedValue([]);
      mockClient.prompts.list = vi.fn().mockResolvedValue([]);

      rerender({ sessionId: 'session-456' });

      await waitFor(() => {
        expect(mockClient.messages.list).toHaveBeenCalledWith('session-456');
      });
    });
  });

  describe('useMessages Hook', () => {
    it('should fetch messages with polling enabled', async () => {
      const { result } = renderHook(() => useMessages('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBackendMessages);
      expect(mockClient.messages.list).toHaveBeenCalledWith('session-123');
    });

    it('should handle different message types correctly', async () => {
      const messagesWithSystem = [...mockBackendMessages, mockSystemMessage];
      mockClient.messages.list = vi.fn().mockResolvedValue(messagesWithSystem);

      const { result } = renderHook(() => useMessages('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const messages = result.current.data || [];
      expect(messages).toHaveLength(messagesWithSystem.length);

      // Verify different message types
      const userMessages = messages.filter((m) => m.type === 'user');
      const assistantMessages = messages.filter((m) => m.type === 'assistant');
      const systemMessages = messages.filter((m) => m.type === 'system');

      expect(userMessages.length).toBeGreaterThan(0);
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(systemMessages.length).toBe(1);
    });

    it('should handle complex messages with tool use and tool results', async () => {
      mockClient.messages.list = vi.fn().mockResolvedValue(mockComplexMessages);

      const { result } = renderHook(() => useMessages('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const messages = result.current.data || [];

      // Find tool use message
      const toolUseMessage = messages.find((m) =>
        m.message?.content?.some((c) => c.type === 'tool_use')
      );
      expect(toolUseMessage).toBeDefined();
      expect(toolUseMessage?.type).toBe('assistant');

      // Find tool result message
      const toolResultMessage = messages.find((m) => m.type === 'tool_result');
      expect(toolResultMessage).toBeDefined();
      expect(toolResultMessage?.parent_tool_use_id).toBe('tool-complex-001');
    });

    it('should not fetch when sessionId is empty', () => {
      const { result } = renderHook(() => useMessages(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockClient.messages.list).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockClient.messages.list = vi.fn().mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useMessages('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('usePrompts Hook', () => {
    it('should fetch prompts for a session', async () => {
      const { result } = renderHook(() => usePrompts('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPrompts);
      expect(mockClient.prompts.list).toHaveBeenCalledWith('session-123');
    });

    it('should return empty array when no prompts exist', async () => {
      mockClient.prompts.list = vi.fn().mockResolvedValue([]);

      const { result } = renderHook(() => usePrompts('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Message Content Types', () => {
    it('should handle text content in messages', async () => {
      const { result } = renderHook(() => useMessages('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 10000 });

      const messages = result.current.data || [];
      const firstMessage = messages[0];

      expect(firstMessage.message?.content[0].type).toBe('text');
      expect(firstMessage.message?.content[0]).toHaveProperty('text');
    });

    it('should handle usage information in messages', async () => {
      const { result } = renderHook(() => useMessages('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 10000 });

      const messages = result.current.data || [];
      const messageWithUsage = messages.find((m) => m.message?.usage);

      expect(messageWithUsage).toBeDefined();
      expect(messageWithUsage?.message?.usage).toHaveProperty('input_tokens');
      expect(messageWithUsage?.message?.usage).toHaveProperty('output_tokens');
      expect(messageWithUsage?.message?.usage).toHaveProperty('cache_read_input_tokens');
    });
  });

  describe('API Parameter Testing - Bug Demonstration', () => {
    it('should call messages.list with sessionId (CURRENT BUGGY BEHAVIOR)', async () => {
      const { result } = renderHook(() => useMessages('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 10000 });

      // This demonstrates the bug - we're calling with sessionId
      expect(mockClient.messages.list).toHaveBeenCalledWith('session-123');
      // But the backend expects promptId, not sessionId
      // This is why we get "Required parameter 'promptId' was null or undefined"
    });

    it('should call prompts.list with sessionId (CORRECT BEHAVIOR)', async () => {
      const { result } = renderHook(() => usePrompts('session-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 10000 });

      // Prompts correctly use sessionId
      expect(mockClient.prompts.list).toHaveBeenCalledWith('session-123');
    });

    it('demonstrates the correct flow: session → prompts → messages', async () => {
      // This test demonstrates how it SHOULD work:
      // 1. Get prompts for a session
      const { result: promptsResult } = renderHook(() => usePrompts('session-123'), { wrapper });

      await waitFor(() => {
        expect(promptsResult.current.isSuccess).toBe(true);
      }, { timeout: 10000 });

      const prompts = promptsResult.current.data || [];
      expect(prompts.length).toBeGreaterThan(0);

      // 2. For each prompt, get its messages using promptId
      // (This is what the code SHOULD do, but currently doesn't)
      const promptId = prompts[0].id;
      expect(promptId).toBe('prompt-1');

      // The messages.list call should use promptId, not sessionId
      // Currently: api.messages.list(sessionId)  ❌
      // Should be: api.messages.list(promptId)   ✓
    });
  });
});
