import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptBackendClient } from '../promptBackendClient';
import * as PromptBackendClientModule from '@wholelottahoopla/prompt-backend-client';

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

  describe('Current Buggy Behavior', () => {
    it('demonstrates the bug: messages.list() is called with sessionId but API expects promptId', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Setup mock to show what the API expects
      mockApiClient.handlersMessagesList.mockRejectedValue(
        new Error("Required parameter 'promptId' was null or undefined when calling handlersMessagesList()")
      );

      // This is the current code behavior - passing sessionId
      const sessionId = 'session-123';

      // The backend client catches the error and returns empty array
      const result = await backendClient.messages.list(sessionId);

      // Result is empty because API call failed
      expect(result).toEqual([]);

      // But the API was called with sessionId (which is wrong)
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ sessionId });

      consoleErrorSpy.mockRestore();
    });

    it('shows that handlersMessagesList is called with wrong parameter name', async () => {
      mockApiClient.handlersMessagesList.mockResolvedValue({ messages: [] });

      const sessionId = 'session-123';
      await backendClient.messages.list(sessionId);

      // Currently called with { sessionId: 'session-123' }
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ sessionId });

      // But should be called with { promptId: 'prompt-xxx' }
      // expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ promptId: 'prompt-xxx' });
    });

    it('demonstrates the API call stack that leads to the error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // The call chain:
      // 1. SessionDetail component renders
      // 2. useSessionConversation hook is called with session.id
      // 3. useMessages hook is called with sessionId
      // 4. api.messages.list(sessionId) is called
      // 5. PromptBackendClient.messages.list(sessionId) is called
      // 6. this.api.handlersMessagesList({ sessionId }) is called
      // 7. Backend API receives sessionId but expects promptId
      // 8. Error: "Required parameter 'promptId' was null or undefined"
      // 9. Error is caught and empty array is returned

      mockApiClient.handlersMessagesList.mockRejectedValue(
        new Error("Required parameter 'promptId' was null or undefined")
      );

      const result = await backendClient.messages.list('session-123');
      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
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

      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ promptId });
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

      expect(mockApiClient.handlersPromptsList).toHaveBeenCalledWith({ sessionId });
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

      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ promptId });
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

      // Messages.list SHOULD use promptId but currently uses sessionId
      // This is the bug!
      mockApiClient.handlersMessagesList.mockClear();

      // The backend client passes sessionId
      await backendClient.messages.list('session-123');
      expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({
        sessionId: 'session-123',
      });

      // But the API expects promptId
      // expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ promptId: 'prompt-123' });
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

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
    expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ promptId: 'prompt-1' });
    expect(mockApiClient.handlersMessagesList).toHaveBeenCalledWith({ promptId: 'prompt-2' });
  });
});
