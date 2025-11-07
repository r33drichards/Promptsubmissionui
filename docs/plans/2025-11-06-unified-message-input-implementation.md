# Unified Message Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicate message input UI and consolidate on @assistant-ui/react Thread component's built-in input.

**Architecture:** Wire Thread component's `onNew` callback to create prompts via new `useCreatePrompt` hook, following existing patterns (API client methods, React Query hooks). Remove custom Reply textarea from SessionDetail.

**Tech Stack:** React, TypeScript, TanStack Query, @assistant-ui/react, @wholelottahoopla/prompt-backend-client

---

## Task 1: Add prompts.create() to PromptBackendClient

**Files:**

- Modify: `src/services/api/promptBackendClient.ts:176-186`

**Step 1: Write the test**

Create test file to verify prompt creation:

```typescript
// src/services/api/__tests__/promptCreation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptBackendClient } from '../promptBackendClient';
import { DefaultApi } from '@wholelottahoopla/prompt-backend-client';

vi.mock('@wholelottahoopla/prompt-backend-client');

describe('PromptBackendClient.prompts.create', () => {
  let client: PromptBackendClient;
  let mockApi: DefaultApi;

  beforeEach(() => {
    mockApi = new DefaultApi() as any;
    client = new PromptBackendClient();
    (client as any).api = mockApi;
  });

  it('should create a prompt with message content', async () => {
    const mockPrompt = {
      id: 'prompt-123',
      sessionId: 'session-456',
      content: 'Hello world',
      created_at: '2025-11-06T00:00:00Z',
      inbox_status: 'pending',
      data: [{ content: 'Hello world', type: 'text' }],
    };

    mockApi.handlersPromptsCreate = vi.fn().mockResolvedValue({
      prompt: mockPrompt,
    });

    const result = await client.prompts.create('session-456', 'Hello world');

    expect(mockApi.handlersPromptsCreate).toHaveBeenCalledWith({
      createPromptInput: {
        sessionId: 'session-456',
        data: [{ content: 'Hello world', type: 'text' }],
      },
    });

    expect(result).toEqual({
      id: 'prompt-123',
      sessionId: 'session-456',
      content: 'Hello world',
      createdAt: expect.any(Date),
      status: 'pending',
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/services/api/__tests__/promptCreation.test.ts
```

Expected: FAIL - "client.prompts.create is not a function"

**Step 3: Implement prompts.create() method**

In `src/services/api/promptBackendClient.ts`, modify the `prompts` object (line 176):

```typescript
prompts = {
  list: async (sessionId: string): Promise<Prompt[]> => {
    try {
      const response = await this.api.handlersPromptsList({ sessionId });
      return this.deserializePrompts(response.prompts || []);
    } catch (error) {
      console.error('[PromptBackendClient] Failed to list prompts:', error);
      return [];
    }
  },

  create: withErrorHandler(
    async (sessionId: string, content: string): Promise<Prompt> => {
      const response = await this.api.handlersPromptsCreate({
        createPromptInput: {
          sessionId,
          data: [{ content, type: 'text' }],
        },
      });

      if (!response.prompt) {
        throw new Error(
          'Failed to create prompt: Invalid response from backend'
        );
      }

      return this.deserializePrompt(response.prompt);
    },
    'Creating prompt'
  ),
};
```

**Step 4: Update BackendClient type interface**

In `src/services/api/types.ts`, add the `create` method to the `prompts` interface:

```typescript
prompts: {
  list: (sessionId: string) => Promise<Prompt[]>;
  create: (sessionId: string, content: string) => Promise<Prompt>; // ADD THIS
}
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/services/api/__tests__/promptCreation.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/services/api/promptBackendClient.ts src/services/api/types.ts src/services/api/__tests__/promptCreation.test.ts
git commit -m "feat: add prompts.create() method to PromptBackendClient

- Add create method to prompts API surface
- Format messages in Claude Code format
- Add type definition to BackendClient interface
- Add comprehensive test coverage"
```

---

## Task 2: Create useCreatePrompt Hook

**Files:**

- Modify: `src/hooks/useMessages.ts:143` (after useCreateMessage)
- Modify: `src/hooks/queryKeys.ts` (verify prompts keys exist)

**Step 1: Verify queryKeys for prompts**

Check `src/hooks/queryKeys.ts` has prompts keys:

```typescript
prompts: {
  all: ['prompts'] as const,
  lists: () => [...queryKeys.prompts.all, 'list'] as const,
  list: (sessionId: string) => [...queryKeys.prompts.lists(), sessionId] as const,
  details: () => [...queryKeys.prompts.all, 'detail'] as const,
  detail: (id: string) => [...queryKeys.prompts.details(), id] as const,
},
```

If not present, add it.

**Step 2: Write test for useCreatePrompt hook**

Create test file:

```typescript
// src/hooks/__tests__/useCreatePrompt.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreatePrompt } from '../useMessages';
import { ApiProvider } from '../../providers/ApiProvider';
import { PromptBackendClient } from '../../services/api/promptBackendClient';
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
```

**Step 3: Run test to verify it fails**

```bash
npm test -- src/hooks/__tests__/useCreatePrompt.test.tsx
```

Expected: FAIL - "useCreatePrompt is not exported"

**Step 4: Implement useCreatePrompt hook**

In `src/hooks/useMessages.ts`, add after `useCreateMessage` function (around line 143):

````typescript
/**
 * Hook to create a new prompt in a session.
 *
 * Features:
 * - Automatically invalidates prompt cache
 * - Shows success/error toasts
 *
 * @example
 * ```tsx
 * const createPrompt = useCreatePrompt('session-123');
 *
 * const handleSend = () => {
 *   createPrompt.mutate('Hello, world!');
 * };
 * ```
 */
export function useCreatePrompt(
  sessionId: string,
  options?: Omit<UseMutationOptions<Prompt, Error, string>, 'mutationFn'>
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => api.prompts.create(sessionId, content),
    onSuccess: (newPrompt, content, context) => {
      // Invalidate prompts query to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.prompts.list(sessionId),
      });

      toast.success('Message sent');
      options?.onSuccess?.(newPrompt, content, context);
    },
    onError: (error, content, context) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      options?.onError?.(error, content, context);
    },
    ...options,
  });
}
````

**Step 5: Ensure hook is exported**

Verify `src/hooks/index.ts` exports from useMessages:

```typescript
export * from './useMessages';
```

This should already export `useCreatePrompt` since we're adding it to that file.

**Step 6: Run test to verify it passes**

```bash
npm test -- src/hooks/__tests__/useCreatePrompt.test.tsx
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/hooks/useMessages.ts src/hooks/__tests__/useCreatePrompt.test.tsx src/hooks/queryKeys.ts
git commit -m "feat: add useCreatePrompt React Query hook

- Create mutation hook for prompt creation
- Invalidate cache on success
- Add toast notifications for user feedback
- Add comprehensive test coverage"
```

---

## Task 3: Update useAssistantRuntime to Wire onNew

**Files:**

- Modify: `src/hooks/useAssistantRuntime.ts:1-30`

**Step 1: Write test for onNew handler**

Create test file:

```typescript
// src/hooks/__tests__/useAssistantRuntime.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssistantRuntime } from '../useAssistantRuntime';
import { ApiProvider } from '../../providers/ApiProvider';
import React from 'react';

const mockCreatePrompt = vi.fn();

vi.mock('../useMessages', () => ({
  useCreatePrompt: () => ({
    mutateAsync: mockCreatePrompt
  })
}));

const mockClient = {} as any;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider client={mockClient}>
        {children}
      </ApiProvider>
    </QueryClientProvider>
  );
};

describe('useAssistantRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call createPrompt when onNew is triggered with text content', async () => {
    const { result } = renderHook(
      () => useAssistantRuntime('session-123', [], false),
      { wrapper }
    );

    const message = {
      content: [{ type: 'text' as const, text: 'Hello world' }]
    };

    await result.current.adapter.onNew(message as any);

    expect(mockCreatePrompt).toHaveBeenCalledWith('Hello world');
  });

  it('should not call createPrompt when content is empty', async () => {
    const { result } = renderHook(
      () => useAssistantRuntime('session-123', [], false),
      { wrapper }
    );

    const message = {
      content: [{ type: 'text' as const, text: '' }]
    };

    await result.current.adapter.onNew(message as any);

    expect(mockCreatePrompt).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/hooks/__tests__/useAssistantRuntime.test.tsx
```

Expected: FAIL - "useAssistantRuntime signature doesn't match" or "adapter not returned"

**Step 3: Update useAssistantRuntime implementation**

Replace the entire contents of `src/hooks/useAssistantRuntime.ts`:

```typescript
import { useMemo } from 'react';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import type { ExternalStoreAdapter } from '@assistant-ui/react';
import { ConversationItem } from './useMessages';
import { convertConversationToThreadMessages } from '@/utils/assistantUiAdapter';
import { useCreatePrompt } from './useMessages';

export function useAssistantRuntime(
  sessionId: string,
  conversation: ConversationItem[],
  isLoading: boolean
) {
  const createPrompt = useCreatePrompt(sessionId);

  const messages = useMemo(
    () => convertConversationToThreadMessages(conversation),
    [conversation]
  );

  const adapter: ExternalStoreAdapter = useMemo(
    () => ({
      isLoading,
      messages,
      onNew: async (message) => {
        // Extract text content from message
        const content =
          message.content.find((p) => p.type === 'text')?.text || '';
        if (content.trim()) {
          await createPrompt.mutateAsync(content);
        }
      },
    }),
    [messages, isLoading, createPrompt]
  );

  return useExternalStoreRuntime(adapter);
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/hooks/__tests__/useAssistantRuntime.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useAssistantRuntime.ts src/hooks/__tests__/useAssistantRuntime.test.tsx
git commit -m "feat: wire useAssistantRuntime onNew to create prompts

- Add sessionId parameter to hook signature
- Import and use useCreatePrompt hook
- Implement onNew handler to extract text and create prompt
- Add test coverage for onNew behavior"
```

---

## Task 4: Update SessionDetail to Remove Custom Reply UI

**Files:**

- Modify: `src/components/SessionDetail.tsx:13-169`

**Step 1: Update existing tests**

Modify `src/components/__tests__/SessionDetail.test.tsx` to remove onReply expectations:

```typescript
// Remove any test assertions about onReply callback
// Update test setup to not pass onReply prop
// Example changes:

it('should render session details', () => {
  const mockSession = createMockSession();

  render(
    <SessionDetail
      session={mockSession}
      onCreatePR={vi.fn()}
      // REMOVE: onReply={vi.fn()}
    />
  );

  // ... rest of test
});

// REMOVE any tests specifically testing the Reply textarea
```

**Step 2: Run tests to see current failures**

```bash
npm test -- src/components/__tests__/SessionDetail.test.tsx
```

Expected: Tests should still pass (we haven't changed component yet)

**Step 3: Update SessionDetail component**

In `src/components/SessionDetail.tsx`:

```typescript
// Update imports - remove Textarea and useState
import { Session } from '../types/session';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ExternalLink, GitBranch, Github, GitMerge } from 'lucide-react';
// REMOVE: import { Textarea } from './ui/textarea';
// REMOVE: import { useState } from 'react';
import { useSessionConversation } from '../hooks/useMessages';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import { useAssistantRuntime } from '../hooks/useAssistantRuntime';
import '@assistant-ui/react-ui/styles/index.css';

// Update interface - remove onReply
interface SessionDetailProps {
  session: Session;
  onCreatePR: (sessionId: string) => void;
  // REMOVE: onReply: (sessionId: string, message: string) => void;
}

export function SessionDetail({
  session,
  onCreatePR,
  // REMOVE: onReply,
}: SessionDetailProps) {
  // REMOVE: const [reply, setReply] = useState('');
  const { conversation, isLoading } = useSessionConversation(session.id);
  // UPDATE: Add sessionId parameter
  const runtime = useAssistantRuntime(session.id, conversation || [], isLoading);

  // REMOVE: handleReply function
  // REMOVE: const handleReply = () => { ... };

  return (
    <div className="flex flex-col h-full">
      {/* Session Header - unchanged */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="mb-2">{session.title}</h2>
            {session.statusMessage && (
              <p className="text-sm text-gray-600 mb-2 italic">
                {session.statusMessage}
              </p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Github className="w-4 h-4 flex-shrink-0" />
                <a
                  href={`https://github.com/${session.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline truncate"
                >
                  {session.repo}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-shrink">
                  <GitBranch className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`https://github.com/${session.repo}/tree/${session.branch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline truncate"
                  >
                    {session.branch}
                  </a>
                </div>
                <GitMerge className="w-3 h-3 flex-shrink-0" />
                <div className="flex items-center gap-1 min-w-0 flex-shrink">
                  <GitBranch className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`https://github.com/${session.repo}/tree/${session.targetBranch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline truncate"
                  >
                    {session.targetBranch}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              session.inboxStatus === 'completed'
                ? 'bg-green-50 text-green-700 border-green-300'
                : session.inboxStatus === 'in-progress'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : session.inboxStatus === 'failed'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-gray-50 text-gray-700 border-gray-300'
            }
          >
            {session.inboxStatus}
          </Badge>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread className="flex-1" />
        </AssistantRuntimeProvider>

        {session.inboxStatus === 'completed' && session.diffStats && (
          <div className="p-4 border-t">
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium">Changes</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-green-600">
                  +{session.diffStats.additions} additions
                </span>
                <span className="text-sm text-red-600">
                  -{session.diffStats.deletions} deletions
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - NO Reply textarea */}
      <div className="border-t p-4">
        {session.prUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(session.prUrl, '_blank')}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View PR
          </Button>
        ) : session.inboxStatus === 'completed' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreatePR(session.id)}
            className="w-full"
          >
            <Github className="w-4 h-4 mr-2" />
            Create PR
          </Button>
        ) : null}

        {/* REMOVE entire Reply textarea section (lines 150-165) */}
      </div>
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- src/components/__tests__/SessionDetail.test.tsx
```

Expected: PASS (with updated tests)

**Step 5: Commit**

```bash
git add src/components/SessionDetail.tsx src/components/__tests__/SessionDetail.test.tsx
git commit -m "feat: remove custom Reply UI from SessionDetail

- Remove onReply prop from SessionDetailProps
- Remove reply state and handleReply function
- Update useAssistantRuntime call with sessionId parameter
- Remove Textarea and Send button UI
- Keep PR action buttons
- Update tests to match new interface"
```

---

## Task 5: Update App.tsx to Remove handleReply

**Files:**

- Modify: `src/App.tsx:190-200,336`

**Step 1: Update App.tsx**

Remove `handleReply` function and `onReply` prop:

```typescript
// In src/App.tsx

// REMOVE handleReply function (lines 190-200):
// const handleReply = (sessionId: string, _message: string) => { ... };

// UPDATE SessionDetail usage (line 336):
// BEFORE:
<SessionDetail
  session={selectedSession}
  onCreatePR={handleCreatePR}
  onReply={handleReply}
/>

// AFTER:
<SessionDetail
  session={selectedSession}
  onCreatePR={handleCreatePR}
/>
```

**Step 2: Run tests**

```bash
npm test
```

Expected: All tests PASS

**Step 3: Run linter**

```bash
npm run lint
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: remove handleReply from App component

- Remove handleReply function (no longer needed)
- Remove onReply prop from SessionDetail usage
- SessionDetail now handles message sending internally"
```

---

## Task 6: Run Full Test Suite and Linter

**Files:**

- None (verification task)

**Step 1: Run complete test suite**

```bash
npm test
```

Expected: All tests PASS

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No errors or warnings

**Step 3: Run formatter check**

```bash
npm run format:check
```

Expected: All files properly formatted

**Step 4: Fix any formatting issues**

If formatter check fails:

```bash
npm run format
```

**Step 5: Commit any formatting fixes**

```bash
git add .
git commit -m "style: apply formatter fixes"
```

---

## Task 7: Manual Testing Verification

**Files:**

- None (manual testing task)

**Step 1: Start development server**

```bash
npm run dev
```

**Step 2: Test message sending**

1. Navigate to a session detail page
2. Verify only ONE message input is visible (Thread component's input)
3. Type a test message
4. Click send or press Cmd+Enter
5. Verify toast appears: "Message sent"
6. Wait 2 seconds for polling
7. Verify message appears in conversation

**Step 3: Test error handling**

1. Disconnect network or stop backend
2. Try sending a message
3. Verify error toast appears: "Failed to send message"
4. Verify UI remains functional

**Step 4: Test PR button still works**

1. Navigate to a completed session
2. Verify "Create PR" button appears
3. Click it and verify PR creation flow

**Step 5: Document results**

Create verification document:

```bash
cat > docs/manual-test-results.md << 'EOF'
# Manual Testing Results - Unified Message Input

**Date:** 2025-11-06
**Tester:** [Your name]

## Test Cases

### Message Sending
- [ ] Single input visible (Thread component)
- [ ] Can type message
- [ ] Can send with button click
- [ ] Can send with Cmd+Enter
- [ ] Success toast appears
- [ ] Message appears in conversation after ~2s

### Error Handling
- [ ] Error toast on network failure
- [ ] UI remains functional after error
- [ ] Can retry after error

### Existing Features
- [ ] PR button works on completed sessions
- [ ] Session navigation works
- [ ] All other UI elements functional

## Issues Found

[List any issues]

## Notes

[Any additional observations]
EOF
```

**Step 6: Commit manual test results**

```bash
git add docs/manual-test-results.md
git commit -m "docs: add manual testing verification results"
```

---

## Task 8: Final Review and Cleanup

**Files:**

- Review all modified files

**Step 1: Review all changes**

```bash
git log --oneline -10
git diff main..HEAD
```

**Step 2: Verify all files formatted**

```bash
npm run format:check
```

**Step 3: Run final full test suite**

```bash
npm test
```

**Step 4: Check for unused imports**

```bash
npm run lint
```

**Step 5: Update any documentation if needed**

Check if README or other docs need updates for the new behavior.

**Step 6: Create summary commit if needed**

If any final tweaks were made:

```bash
git add .
git commit -m "chore: final cleanup for unified message input"
```

---

## Success Criteria

- ✅ All tests passing
- ✅ Linter clean
- ✅ Formatter clean
- ✅ Only one message input visible in SessionDetail
- ✅ Messages can be sent via Thread component
- ✅ Toast notifications working
- ✅ Polling updates conversation
- ✅ Error handling functional
- ✅ PR buttons still work
- ✅ No TypeScript errors
- ✅ All commits follow conventional commit format

---

## Rollback Plan

If issues arise:

```bash
# Return to previous state
git reset --hard origin/main

# Or revert specific commits
git revert HEAD~8..HEAD
```

---

## Notes for Engineer

- Follow TDD: Write test first, watch it fail, implement, watch it pass
- Commit after each task completion
- Run tests frequently during development
- The Thread component handles Cmd+Enter automatically
- Polling interval is 2 seconds (configured in usePrompts/useMessages hooks)
- Error handling uses sonner toast library
- All API calls wrapped with withErrorHandler for consistent UX
