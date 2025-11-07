# Unified Message Input Design

**Date:** 2025-11-06
**Status:** Approved

## Overview

Remove duplicate message input UI in SessionDetail and consolidate on the @assistant-ui/react Thread component's built-in input. This eliminates confusion and provides a cleaner UX by having a single message input interface.

## Current State

The SessionDetail component currently has two message input UIs:

1. **Thread Component Input** (from @assistant-ui/react) - Shows "Write a message..." placeholder but doesn't handle sending
2. **Custom Reply Textarea** (lines 150-165) - Shows "Reply..." placeholder and handles actual message sending via `onReply` prop

The Thread component's `onNew` handler is intentionally empty (line 20-23 in useAssistantRuntime.ts), making it read-only. The custom textarea calls `onReply`, which only updates session status to 'in-progress' but doesn't actually create messages.

## Goals

1. Remove custom Reply textarea to eliminate duplicate UI
2. Wire Thread component's input to create prompts in the backend
3. Maintain existing UX features (Cmd+Enter shortcut is built into Thread)
4. Follow existing code patterns (API client methods, React Query hooks)

## Architecture

### Message Flow

```
User types in Thread input
    ↓
Thread calls onNew callback
    ↓
onNew calls useCreatePrompt mutation
    ↓
Backend API creates prompt with message
    ↓
Polling hooks refresh conversation (2s interval)
    ↓
New prompt/messages appear in Thread
```

### Component Hierarchy

```
SessionDetail
  └── AssistantRuntimeProvider (with runtime from useAssistantRuntime)
      └── Thread (built-in input now functional)
```

## Implementation Details

### 1. PromptBackendClient Enhancement

**File:** `src/services/api/promptBackendClient.ts`
**Location:** Line 176 (prompts object)

Add `create` method to the `prompts` API surface:

```typescript
prompts = {
  list: async (sessionId: string): Promise<Prompt[]> => {
    // ... existing implementation
  },

  create: withErrorHandler(
    async (sessionId: string, content: string): Promise<Prompt> => {
      const response = await this.api.handlersPromptsCreate({
        createPromptInput: {
          sessionId,
          data: [{ content, type: 'text' }], // Claude Code message format
        },
      });
      return this.deserializePrompt(response.prompt);
    },
    'Creating prompt'
  ),
};
```

**Key Details:**

- Uses existing `handlersPromptsCreate` from SDK
- Formats message in Claude Code format (array with content/type)
- Wrapped with `withErrorHandler` for consistent error handling
- Returns deserialized Prompt object

### 2. useCreatePrompt Hook

**File:** `src/hooks/useMessages.ts`
**Location:** After `useCreateMessage` function (around line 143)

Add new React Query mutation hook:

```typescript
export function useCreatePrompt(
  sessionId: string,
  options?: Omit<UseMutationOptions<Prompt, Error, string>, 'mutationFn'>
) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => api.prompts.create(sessionId, content),
    onSuccess: (newPrompt, content) => {
      // Invalidate prompts query to trigger refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.prompts.list(sessionId),
      });

      toast.success('Message sent');
      options?.onSuccess?.(newPrompt, content, undefined);
    },
    onError: (error, content) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      options?.onError?.(error, content, undefined);
    },
    ...options,
  });
}
```

**Key Details:**

- Follows same pattern as `useCreateMessage`
- Invalidates prompts query cache on success
- Shows toast notifications for user feedback
- Passes through custom options for flexibility

### 3. useAssistantRuntime Hook Update

**File:** `src/hooks/useAssistantRuntime.ts`
**Changes:**

- Add `sessionId` parameter
- Import and use `useCreatePrompt` hook
- Implement `onNew` handler to create prompts

```typescript
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
        if (content) {
          await createPrompt.mutateAsync(content);
        }
      },
    }),
    [messages, isLoading, createPrompt]
  );

  return useExternalStoreRuntime(adapter);
}
```

**Key Details:**

- `onNew` receives message object from Thread component
- Extracts text content from message parts
- Only sends if content exists
- Uses `mutateAsync` for async handling

### 4. SessionDetail Component Cleanup

**File:** `src/components/SessionDetail.tsx`
**Changes:**

- Remove `onReply` prop from interface
- Remove `reply` state and `handleReply` function
- Update `useAssistantRuntime` call with `sessionId`
- Remove custom Reply textarea (lines 150-165)
- Keep PR action buttons

**Before:**

```typescript
interface SessionDetailProps {
  session: Session;
  onCreatePR: (sessionId: string) => void;
  onReply: (sessionId: string, message: string) => void; // REMOVE
}

const [reply, setReply] = useState(''); // REMOVE
const runtime = useAssistantRuntime(conversation || [], isLoading); // UPDATE
```

**After:**

```typescript
interface SessionDetailProps {
  session: Session;
  onCreatePR: (sessionId: string) => void;
  // onReply removed
}

const runtime = useAssistantRuntime(session.id, conversation || [], isLoading);
```

**Remove entire textarea section:**

```typescript
// DELETE lines 150-165
<div className="flex gap-2">
  <Textarea ... />
  <Button onClick={handleReply}>Send</Button>
</div>
```

**Keep action buttons section:**

```typescript
<div className="border-t p-4">
  {/* PR buttons remain */}
</div>
```

### 5. App.tsx Cleanup

**File:** `src/App.tsx`
**Changes:**

- Remove `handleReply` function (lines 190-200)
- Remove `onReply` prop from SessionDetail (line 336)

### 6. Export Hook

**File:** `src/hooks/index.ts`
**Changes:**

- Ensure `useCreatePrompt` is exported (already exports from './useMessages')

## Data Flow

### Creating a Message

1. User types message in Thread input and submits
2. Thread component calls `onNew(message)`
3. `onNew` extracts text content
4. Calls `createPrompt.mutateAsync(content)`
5. Hook calls `api.prompts.create(sessionId, content)`
6. API client calls `handlersPromptsCreate` with formatted data
7. Backend creates Prompt with associated Message
8. On success, query cache invalidates
9. Polling hooks refetch within 2 seconds
10. New conversation data flows into Thread

### Polling & Refresh

- `usePrompts` polls every 2 seconds
- `useMessages` polls every 2 seconds for each prompt
- After creating prompt, cache invalidation triggers immediate refetch
- Thread re-renders with new messages

## Error Handling

- **Network Errors:** Caught by `withErrorHandler`, shows toast notification
- **Validation Errors:** Empty content filtered in `onNew` before API call
- **Backend Errors:** API client deserializes error responses, shows via toast
- **Race Conditions:** React Query handles deduplication and cache management

## Testing Considerations

1. **Unit Tests:**
   - Test `useCreatePrompt` mutation success/error paths
   - Test `onNew` handler extracts content correctly
   - Test empty content is filtered

2. **Integration Tests:**
   - Verify Thread input creates prompts
   - Verify new messages appear after creation
   - Verify error handling shows user feedback

3. **E2E Tests:**
   - User can send message via Thread input
   - Message appears in conversation
   - Error states display appropriately

## Migration Notes

### Breaking Changes

- `SessionDetailProps` no longer accepts `onReply` prop
- `useAssistantRuntime` now requires `sessionId` as first parameter

### Backwards Compatibility

- No data migration needed
- API endpoints remain unchanged
- Existing sessions/prompts unaffected

## Benefits

1. **Cleaner UX:** Single input interface eliminates confusion
2. **Consistency:** Uses @assistant-ui/react patterns throughout
3. **Maintainability:** Less code, fewer props to pass
4. **Feature Parity:** Thread component has built-in Cmd+Enter support
5. **Type Safety:** Proper typing through React Query and SDK

## Future Enhancements

1. **Optimistic Updates:** Add optimistic message rendering before backend confirms
2. **Retry Logic:** Add automatic retry for failed message creation
3. **Offline Support:** Queue messages when offline, send when reconnected
4. **Rich Content:** Support attachments, images, code blocks in messages
