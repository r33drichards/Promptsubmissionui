import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptBackendClient } from '../promptBackendClient';

/**
 * This test demonstrates the bug where the actual API returns data nested
 * under a "data" field, but the deserialization doesn't account for it.
 */

describe('Data Wrapper Bug', () => {
  let backendClient: PromptBackendClient;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      handlersMessagesList: vi.fn(),
      handlersPromptsList: vi.fn(),
    };

    backendClient = new PromptBackendClient();
    (backendClient as any).api = mockApiClient;
  });

  describe('Message Deserialization', () => {
    it('demonstrates the bug: actual API response has data wrapper', async () => {
      // This is what the ACTUAL API returns (from user's screenshot)
      mockApiClient.handlersMessagesList.mockResolvedValue({
        messages: [
          {
            id: 'd6b4f375-f20b-4f3a-8e5f-8a873d403bec',
            prompt_id: '33943347-c71e-427f-a9b0-b56732d4731a',
            data: {
              message: {
                content: [
                  {
                    text: 'I need to understand what "this" refers to.',
                    type: 'text',
                  },
                ],
                id: 'msg_01Wrepvdj4SXNabhCFA178ZX',
                role: 'assistant',
                type: 'message',
              },
              parent_tool_use_id: null,
              session_id: '424257b8-705a-462e-ad5f-afd041a424dc',
              type: 'assistant',
              uuid: '83ba2e18-07f4-4ca4-ba97-812f79fb2ba4',
            },
            created_at: '2025-11-06 22:41:31.498192 +00:00',
            updated_at: '2025-11-06 22:41:31.498192 +00:00',
          },
        ],
      });

      const result = await backendClient.messages.list('prompt-123');

      // BUG: The current implementation returns:
      // {
      //   type: undefined || 'user',  // defaults to 'user' because msg.type is undefined
      //   uuid: 'd6b4f375-f20b-4f3a-8e5f-8a873d403bec',  // uses msg.id as fallback
      //   message: {},  // empty because msg.message is undefined
      //   session_id: '',
      // }

      console.log('Deserialized result:', JSON.stringify(result, null, 2));

      // Expected behavior (after fix):
      expect(result[0].type).toBe('assistant');
      expect(result[0].message.role).toBe('assistant');
      expect(result[0].message.content).toHaveLength(1);
      expect(result[0].message.content[0].text).toBe(
        'I need to understand what "this" refers to.'
      );
      expect(result[0].uuid).toBe('83ba2e18-07f4-4ca4-ba97-812f79fb2ba4');
      expect(result[0].session_id).toBe('424257b8-705a-462e-ad5f-afd041a424dc');
    });

    it('shows what the deserialization SHOULD produce', async () => {
      // If we fix the deserialization to unwrap the data field:
      mockApiClient.handlersMessagesList.mockResolvedValue({
        messages: [
          {
            data: {
              type: 'assistant',
              uuid: '83ba2e18-07f4-4ca4-ba97-812f79fb2ba4',
              message: {
                content: [{ type: 'text', text: 'Hello' }],
                role: 'assistant',
              },
              session_id: '424257b8-705a-462e-ad5f-afd041a424dc',
              parent_tool_use_id: null,
            },
          },
        ],
      });

      // After fix, we should get:
      // {
      //   type: 'assistant',
      //   uuid: '83ba2e18-07f4-4ca4-ba97-812f79fb2ba4',
      //   message: { content: [...], role: 'assistant' },
      //   session_id: '424257b8-705a-462e-ad5f-afd041a424dc',
      // }
    });
  });

  describe('Prompt Deserialization', () => {
    it('demonstrates the bug: actual API response has data array', async () => {
      // This is what the ACTUAL API returns
      mockApiClient.handlersPromptsList.mockResolvedValue({
        prompts: [
          {
            id: '33943347-c71e-427f-a9b0-b56732d4731a',
            session_id: '424257b8-705a-462e-ad5f-afd041a424dc',
            data: [
              {
                content: 'create a in memory heap store for this',
              },
            ],
            inbox_status: 'Active',
            created_at: '2025-11-06 22:41:20.037132 +00:00',
            updated_at: '2025-11-06 22:41:20.037132 +00:00',
          },
        ],
      });

      const result = await backendClient.prompts.list('session-123');

      console.log('Deserialized prompts:', JSON.stringify(result, null, 2));

      // BUG: The current implementation returns:
      // {
      //   content: '',  // empty because prompt.content is undefined
      //   status: 'pending',  // default because prompt.status is undefined
      //   ...
      // }

      // Expected behavior (after fix):
      expect(result[0].content).toBe('create a in memory heap store for this');
      expect(result[0].status).toBe('Active');
    });
  });
});
