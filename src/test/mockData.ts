import { Session, BackendMessage, Prompt } from '@/types/session';

/**
 * Mock data for testing the detail page and message/prompt functionality.
 * This demonstrates the correct 3-tier hierarchy: Sessions → Prompts → Messages
 */

// Mock Session Data
export const mockSession: Session = {
  id: 'session-123',
  title: 'Add authentication feature',
  repo: 'test-org/test-repo',
  branch: 'claude/auth-feature',
  targetBranch: 'main',
  messages: null,
  inboxStatus: 'in-progress',
  sbxConfig: {
    env: 'production',
    region: 'us-west-2',
  },
  parentId: null,
  createdAt: new Date('2025-01-01T09:00:00Z'),
  sessionStatus: 'Active',
};

export const mockCompletedSession: Session = {
  ...mockSession,
  id: 'session-456',
  title: 'Fix login bug',
  inboxStatus: 'completed',
  diffStats: {
    additions: 150,
    deletions: 45,
  },
  prUrl: undefined,
};

export const mockSessionWithPR: Session = {
  ...mockCompletedSession,
  id: 'session-789',
  title: 'Update dependencies',
  prUrl: 'https://github.com/test-org/test-repo/pull/42',
};

// Mock Prompt Data
export const mockPrompts: Prompt[] = [
  {
    id: 'prompt-1',
    session_id: 'session-123',
    created_at: new Date('2025-01-01T09:01:00Z'),
    updated_at: new Date('2025-01-01T09:01:00Z'),
  },
  {
    id: 'prompt-2',
    session_id: 'session-123',
    created_at: new Date('2025-01-01T09:15:00Z'),
    updated_at: new Date('2025-01-01T09:15:00Z'),
  },
];

// Mock Backend Messages - demonstrating the new message structure
export const mockBackendMessages: BackendMessage[] = [
  {
    type: 'user',
    uuid: 'msg-001',
    message: {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Please add user authentication to the application using JWT tokens.',
        },
      ],
    },
    session_id: 'session-123',
    parent_tool_use_id: null,
  },
  {
    type: 'assistant',
    uuid: 'msg-002',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: "I'll help you add JWT authentication to the application. Let me start by creating the authentication middleware.",
        },
        {
          type: 'tool_use',
          id: 'tool-001',
          name: 'write_file',
          input: {
            path: 'src/middleware/auth.ts',
            content: 'export function authenticate(req, res, next) { ... }',
          },
        },
      ],
      usage: {
        input_tokens: 1250,
        output_tokens: 450,
        cache_read_input_tokens: 800,
        cache_creation_input_tokens: 0,
      },
    },
    session_id: 'session-123',
    parent_tool_use_id: null,
  },
  {
    type: 'tool_result',
    uuid: 'msg-003',
    message: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tool-001',
          content: 'File created successfully',
        },
      ],
    },
    session_id: 'session-123',
    parent_tool_use_id: 'tool-001',
  },
  {
    type: 'assistant',
    uuid: 'msg-004',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Authentication middleware has been created. Now let me add the JWT verification logic.',
        },
      ],
      usage: {
        input_tokens: 2100,
        output_tokens: 325,
        cache_read_input_tokens: 1500,
        cache_creation_input_tokens: 0,
      },
    },
    session_id: 'session-123',
    parent_tool_use_id: null,
  },
];

// Messages for a specific prompt
export const mockMessagesForPrompt1: BackendMessage[] = [
  mockBackendMessages[0],
  mockBackendMessages[1],
];

export const mockMessagesForPrompt2: BackendMessage[] = [
  mockBackendMessages[2],
  mockBackendMessages[3],
];

// Empty states
export const mockEmptyPrompts: Prompt[] = [];
export const mockEmptyMessages: BackendMessage[] = [];

// Complex message examples
export const mockComplexMessages: BackendMessage[] = [
  {
    type: 'user',
    uuid: 'msg-complex-001',
    message: {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Run the tests and show me the results',
        },
      ],
    },
    session_id: 'session-123',
    parent_tool_use_id: null,
  },
  {
    type: 'assistant',
    uuid: 'msg-complex-002',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Running the test suite now.',
        },
        {
          type: 'tool_use',
          id: 'tool-complex-001',
          name: 'bash',
          input: {
            command: 'npm test',
          },
        },
      ],
    },
    session_id: 'session-123',
    parent_tool_use_id: null,
  },
  {
    type: 'tool_result',
    uuid: 'msg-complex-003',
    message: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tool-complex-001',
          content: [
            {
              type: 'text',
              text: 'Test Suites: 5 passed, 5 total\nTests: 42 passed, 42 total',
            },
          ],
        },
      ],
    },
    session_id: 'session-123',
    parent_tool_use_id: 'tool-complex-001',
  },
  {
    type: 'assistant',
    uuid: 'msg-complex-004',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Great! All 42 tests passed successfully.',
        },
      ],
      usage: {
        input_tokens: 3200,
        output_tokens: 150,
        cache_read_input_tokens: 2800,
        cache_creation_input_tokens: 0,
      },
    },
    session_id: 'session-123',
    parent_tool_use_id: null,
  },
];

// System message example
export const mockSystemMessage: BackendMessage = {
  type: 'system',
  uuid: 'msg-system-001',
  message: {
    role: 'system',
    content: [
      {
        type: 'text',
        text: 'Session started with sandbox environment',
      },
    ],
  },
  session_id: 'session-123',
  parent_tool_use_id: null,
};

// Error state message
export const mockErrorMessage: BackendMessage = {
  type: 'error',
  uuid: 'msg-error-001',
  message: {
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: 'An error occurred while processing your request.',
      },
    ],
  },
  session_id: 'session-123',
  parent_tool_use_id: null,
};
