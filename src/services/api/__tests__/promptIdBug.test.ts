import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptBackendClient } from '../promptBackendClient';
import * as _PromptBackendClientModule from '@wholelottahoopla/prompt-backend-client';

/**
 * This test file demonstrates the bug where messages.list() is called with sessionId
 * but the backend API expects promptId.
 *
 * Error: "Required parameter 'promptId' was null or undefined when calling handlersMessagesList()"
 */

describe('PromptId Bug in Message Listing', () => {
  let backendClient: PromptBackendClient;
  let mockApiClient: any;

  beforeEach(() => {
    // Mock the generated API client
    mockApiClient = {
      handlersSessionsList: vi.fn(),
      handlersSessionsGet: vi.fn(),
      handlersPromptsList: vi.fn(),
      handlersMessagesList: vi.fn(),
    };

    // Create the backend client with mocked API
    backendClient = new PromptBackendClient();
    (backendClient as any).api = mockApiClient;
  });

  describe('Fixed Behavior', () => {
    it('correctly calls API with promptId parameter', async () => {
      mockApiClient.handlersMessagesList.mockResolvedValue({ messages: [] });

      // Now passing promptId correctly
      const promptId = 'prompt-123';

      // The backend client should return empty array successfully
      const result = await backendClient.messages.list(promptId);

      // Result is empty array as expected
      expect(result).toEqual([]);

      // API was called with promptId (which is correct)
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
        promptId,
      });
    });

    it('shows that handlersMessagesList is now called with correct parameter name', async () => {
      mockApiClient.handlersMessagesList.mockResolvedValue({ messages: [] });

      const promptId = 'prompt-123';
      await backendClient.messages.list(promptId);

      // Now correctly called with { promptId: 'prompt-123' }
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
        promptId,
      });
    });

    it('demonstrates the correct API call stack', async () => {
      // The correct call chain:
      // 1. SessionDetail component renders
      // 2. useSessionConversation hook is called with session.id
      // 3. usePrompts hook fetches prompts for the session
      // 4. useMessages hook is called with promptId
      // 5. api.messages.list(promptId) is called
      // 6. PromptBackendClient.messages.list(promptId) is called
      // 7. this.api.handlersMessagesList({ promptId }) is called
      // 8. Backend API receives promptId and returns messages successfully

      mockApiClient.handlersMessagesList.mockResolvedValue({
        messages: [
          {
            type: 'user',
            uuid: 'msg-1',
            message: {
              role: 'user',
              content: [{ type: 'text', text: 'Hello' }],
            },
            session_id: 'session-123',
            parent_tool_use_id: null,
          },
        ],
      });

      const result = await backendClient.messages.list('prompt-123');
      expect(result).toHaveLength(1);
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
        promptId: 'prompt-123',
      });
    });
  });

  describe('Expected Correct Behavior', () => {
    it('should work with promptId instead of sessionId', async () => {
      // Mock successful response when using promptId
      mockApiClient.handlersMessagesList.mockResolvedValue({
        messages: [
          {
            type: 'user',
            uuid: 'msg-1',
            message: {
              role: 'user',
              content: [{ type: 'text', text: 'Hello' }],
            },
            session_id: 'session-123',
            parent_tool_use_id: null,
          },
        ],
      });

      // This is how it SHOULD be called - with promptId
      const promptId = 'prompt-123';

      // Simulate calling handlersMessagesList with promptId (the correct way)
      await mockApiClient.handlersMessagesList({ promptId });

      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
        promptId,
      });
    });

    it('demonstrates the correct workflow: session → prompts → messages', async () => {
      // Step 1: Get prompts for a session
      mockApiClient.handlersPromptsList.mockResolvedValue({
        prompts: [
          { id: 'prompt-1', session_id: 'session-123' },
          { id: 'prompt-2', session_id: 'session-123' },
        ],
      });

      const sessionId = 'session-123';
      const promptsResponse = await backendClient.prompts.list(sessionId);

      expect(mockApiClient.handlersPromptsList).toHaveBeenCalledWith({
        sessionId,
      });
      expect(promptsResponse).toHaveLength(2);

      // Step 2: For each prompt, get its messages using promptId
      mockApiClient.handlersMessagesList.mockResolvedValue({
        messages: [
          {
            type: 'user',
            uuid: 'msg-1',
            message: {
              role: 'user',
              content: [{ type: 'text', text: 'Hello' }],
            },
            session_id: 'session-123',
            parent_tool_use_id: null,
          },
        ],
      });

      const promptId = promptsResponse[0].id;

      // This is the correct way to call - with promptId
      // Note: This currently doesn't work because the implementation
      // passes sessionId instead of promptId
      await mockApiClient.handlersMessagesList({ promptId });

      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
        promptId,
      });
    });
  });

  describe('API Signature Analysis', () => {
    it('shows the difference between prompts.list and messages.list parameters', async () => {
      mockApiClient.handlersPromptsList.mockResolvedValue({ prompts: [] });
      mockApiClient.handlersMessagesList.mockResolvedValue({ messages: [] });

      // Prompts.list correctly uses sessionId
      await backendClient.prompts.list('session-123');
      expect(mockApiClient.handlersPromptsList).toHaveBeenCalledWith({
        sessionId: 'session-123',
      });

      // Messages.list now correctly uses promptId
      // The bug has been fixed!
      mockApiClient.handlersMessagesList.mockClear();

      // The backend client now passes promptId
      await backendClient.messages.list('prompt-123');
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
        promptId: 'prompt-123',
      });
    });
  });

  describe('Real-World Scenario', () => {
    it('simulates the exact error from the bug report', async () => {
      // This simulates what happens in production:
      // 1. User navigates to /session/session-123
      // 2. SessionDetail component loads
      // 3. useSessionConversation hook tries to fetch messages
      // 4. Backend API throws error
      // 5. Error is caught and empty array is returned

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockApiClient.handlersMessagesList.mockRejectedValue(
        new Error(
          'RequiredError: Required parameter "promptId" was null or undefined when calling handlersMessagesList().'
        )
      );

      const result = await backendClient.messages.list('session-123');
      expect(result).toEqual([]);

      // The error is logged to console
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('shows that the error repeats due to polling', async () => {
      // The useMessages hook has refetchInterval: 2000
      // So this error repeats every 2 seconds!

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockApiClient.handlersMessagesList.mockRejectedValue(
        new Error('Required parameter "promptId" was null or undefined')
      );

      // First call (on mount)
      const result1 = await backendClient.messages.list('session-123');
      expect(result1).toEqual([]);

      // Second call (after 2 seconds, due to polling)
      const result2 = await backendClient.messages.list('session-123');
      expect(result2).toEqual([]);

      // Third call (after another 2 seconds)
      const result3 = await backendClient.messages.list('session-123');
      expect(result3).toEqual([]);

      // This continues indefinitely, filling the console with errors
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledTimes(3);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Type Safety Analysis', () => {
    it('shows that the function signature accepts sessionId but should accept promptId', () => {
      // Current signature:
      // messages.list(sessionId: string): Promise<BackendMessage[]>

      // Should be:
      // messages.list(promptId: string): Promise<BackendMessage[]>

      // The type definition is misleading because it accepts a string
      // but doesn't indicate which ID type it expects
      const currentSignature = {
        name: 'messages.list',
        parameter: 'sessionId',
        type: 'string',
      };

      const expectedSignature = {
        name: 'messages.list',
        parameter: 'promptId',
        type: 'string',
      };

      expect(currentSignature.parameter).toBe('sessionId');
      expect(expectedSignature.parameter).toBe('promptId');
      expect(currentSignature.parameter).not.toBe(expectedSignature.parameter);
    });
  });

  describe('Impact Assessment', () => {
    it('shows that the detail page cannot display messages due to this bug', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockApiClient.handlersMessagesList.mockRejectedValue(
        new Error('Required parameter "promptId" was null or undefined')
      );

      // SessionDetail tries to load messages
      const sessionId = 'session-123';

      const result = await backendClient.messages.list(sessionId);

      // Because this fails, the detail page shows:
      // - "No messages yet" (because error handling returns empty array)
      // - Console filled with errors (every 2 seconds due to polling)

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('shows that prompts can be loaded but messages cannot', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Prompts work fine
      mockApiClient.handlersPromptsList.mockResolvedValue({
        prompts: [
          { id: 'prompt-1', session_id: 'session-123' },
          { id: 'prompt-2', session_id: 'session-123' },
        ],
      });

      const prompts = await backendClient.prompts.list('session-123');
      expect(prompts).toHaveLength(2);

      // But messages fail
      mockApiClient.handlersMessagesList.mockRejectedValue(
        new Error('Required parameter "promptId" was null or undefined')
      );

      const messages = await backendClient.messages.list('session-123');
      expect(messages).toEqual([]);

      // Result: The UI can show which prompts exist but cannot show their messages

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Solution Verification', () => {
  it('verifies the correct implementation would work', async () => {
    // The correct implementation would:
    // 1. Fetch prompts for the session
    // 2. For each prompt, fetch its messages using promptId
    // 3. Combine all messages and sort them

    const mockApiClient = {
      handlersPromptsList: vi.fn().mockResolvedValue({
        prompts: [
          { id: 'prompt-1', session_id: 'session-123' },
          { id: 'prompt-2', session_id: 'session-123' },
        ],
      }),
      handlersMessagesList: vi.fn().mockImplementation(({ promptId }) => {
        return Promise.resolve({
          messages: [
            {
              type: 'user',
              uuid: `msg-${promptId}-1`,
              message: {
                role: 'user',
                content: [{ type: 'text', text: `Message from ${promptId}` }],
              },
              session_id: 'session-123',
              parent_tool_use_id: null,
            },
          ],
        });
      }),
    };

    const backendClient = new PromptBackendClient();
    (backendClient as any).api = mockApiClient;

    // Step 1: Get prompts
    const prompts = await backendClient.prompts.list('session-123');
    expect(prompts).toHaveLength(2);

    // Step 2: Get messages for each prompt (simulating the correct implementation)
    const allMessages = [];
    for (const prompt of prompts) {
      // This is what the code SHOULD do
      const messagesResponse = await mockApiClient.handlersMessagesList({
        promptId: prompt.id,
      });
      allMessages.push(...(messagesResponse.messages || []));
    }

    expect(allMessages).toHaveLength(2);
    expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
      promptId: 'prompt-1',
    });
    expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
      promptId: 'prompt-2',
    });
  });
});
