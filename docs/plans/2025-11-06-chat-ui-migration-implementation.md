# Chat UI Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from @chatscope/chat-ui-kit-react to @assistant-ui/react to fix visual issues, overflow problems, and improve chat UX.

**Architecture:** Replace chatscope components with assistant-ui primitives, create custom runtime that wraps existing useSessionConversation hook, transform conversation data to assistant-ui format.

**Tech Stack:** @assistant-ui/react, React, TypeScript, TailwindCSS, Vitest

---

## Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install assistant-ui**

```bash
npm install @assistant-ui/react
```

Expected: Package installed successfully

**Step 2: Verify installation**

```bash
npm list @assistant-ui/react
```

Expected: Shows @assistant-ui/react in dependency tree

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @assistant-ui/react"
```

---

## Task 2: Create Data Transformation Function (TDD)

**Files:**

- Create: `src/utils/conversationTransform.ts`
- Create: `src/utils/__tests__/conversationTransform.test.ts`

**Step 1: Write failing test for basic text message transformation**

Create `src/utils/__tests__/conversationTransform.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { convertConversationToMessages } from '../conversationTransform';
import { ConversationItem } from '@/hooks/useMessages';
import { Prompt, BackendMessage } from '@/types/session';

describe('convertConversationToMessages', () => {
  it('should convert a simple prompt with text message', () => {
    const prompt: Prompt = {
      id: 'prompt-1',
      sessionId: 'session-1',
      content: 'Write a hello world function',
      createdAt: new Date('2025-01-01'),
      status: 'completed',
    };

    const message: BackendMessage = {
      type: 'assistant',
      uuid: 'msg-1',
      message: {
        id: 'msg-1',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Here is a hello world function',
          },
        ],
      },
      session_id: 'session-1',
    };

    const conversation: ConversationItem[] = [
      {
        type: 'prompt',
        data: prompt,
        messages: [message],
      },
    ];

    const result = convertConversationToMessages(conversation);

    expect(result).toHaveLength(2); // Prompt + assistant message
    expect(result[0]).toEqual({
      id: 'prompt-1',
      role: 'system',
      content: [
        {
          type: 'text',
          text: 'Write a hello world function',
        },
      ],
      metadata: {
        isPrompt: true,
        status: 'completed',
      },
    });
    expect(result[1]).toEqual({
      id: 'msg-1',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Here is a hello world function',
        },
      ],
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test src/utils/__tests__/conversationTransform.test.ts
```

Expected: FAIL - "Cannot find module '../conversationTransform'"

**Step 3: Write minimal implementation**

Create `src/utils/conversationTransform.ts`:

```typescript
import { ConversationItem } from '@/hooks/useMessages';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: 'text' | 'tool-call' | 'tool-result';
    text?: string;
    toolName?: string;
    toolCallId?: string;
    args?: any;
    result?: any;
  }>;
  metadata?: {
    isPrompt?: boolean;
    status?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
    };
  };
}

export function convertConversationToMessages(
  conversation: ConversationItem[]
): AssistantMessage[] {
  const messages: AssistantMessage[] = [];

  for (const item of conversation) {
    if (item.type === 'prompt') {
      // Add prompt as system message
      messages.push({
        id: item.data.id,
        role: 'system',
        content: [
          {
            type: 'text',
            text: item.data.content,
          },
        ],
        metadata: {
          isPrompt: true,
          status: item.data.status,
        },
      });

      // Add all messages for this prompt
      for (const msg of item.messages) {
        const content = msg.message.content.map((c) => {
          if (c.type === 'text') {
            return { type: 'text' as const, text: c.text || '' };
          }
          if (c.type === 'tool_use') {
            return {
              type: 'tool-call' as const,
              toolName: c.name || '',
              toolCallId: c.id || '',
              args: c.input,
            };
          }
          if (c.type === 'tool_result') {
            return {
              type: 'tool-result' as const,
              toolCallId: c.tool_use_id || '',
              result: c.content,
            };
          }
          return { type: 'text' as const, text: '' };
        });

        messages.push({
          id: msg.uuid,
          role: msg.message.role || (msg.type as 'user' | 'assistant'),
          content,
          metadata: msg.message.usage
            ? {
                usage: msg.message.usage,
              }
            : undefined,
        });
      }
    }
  }

  return messages;
}
```

**Step 4: Run test to verify it passes**

```bash
npm test src/utils/__tests__/conversationTransform.test.ts
```

Expected: PASS - 1 test passing

**Step 5: Commit**

```bash
git add src/utils/conversationTransform.ts src/utils/__tests__/conversationTransform.test.ts
git commit -m "feat: add conversation to messages transformation"
```

---

## Task 3: Add Tests for Tool Calls

**Files:**

- Modify: `src/utils/__tests__/conversationTransform.test.ts`

**Step 1: Write test for tool_use transformation**

Add to `src/utils/__tests__/conversationTransform.test.ts`:

```typescript
it('should convert tool_use to tool-call', () => {
  const prompt: Prompt = {
    id: 'prompt-2',
    sessionId: 'session-1',
    content: 'Run a bash command',
    createdAt: new Date('2025-01-01'),
    status: 'completed',
  };

  const message: BackendMessage = {
    type: 'assistant',
    uuid: 'msg-2',
    message: {
      id: 'msg-2',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'bash',
          input: { command: 'ls -la' },
        },
      ],
    },
    session_id: 'session-1',
  };

  const conversation: ConversationItem[] = [
    {
      type: 'prompt',
      data: prompt,
      messages: [message],
    },
  ];

  const result = convertConversationToMessages(conversation);

  expect(result[1].content[0]).toEqual({
    type: 'tool-call',
    toolName: 'bash',
    toolCallId: 'tool-1',
    args: { command: 'ls -la' },
  });
});
```

**Step 2: Run test**

```bash
npm test src/utils/__tests__/conversationTransform.test.ts
```

Expected: PASS - 2 tests passing

**Step 3: Write test for tool_result transformation**

Add to test file:

```typescript
it('should convert tool_result to tool-result', () => {
  const prompt: Prompt = {
    id: 'prompt-3',
    sessionId: 'session-1',
    content: 'Run a bash command',
    createdAt: new Date('2025-01-01'),
    status: 'completed',
  };

  const toolResultMessage: BackendMessage = {
    type: 'user',
    uuid: 'msg-3',
    message: {
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tool-1',
          content: 'file1.txt\nfile2.txt',
        },
      ],
    },
    session_id: 'session-1',
  };

  const conversation: ConversationItem[] = [
    {
      type: 'prompt',
      data: prompt,
      messages: [toolResultMessage],
    },
  ];

  const result = convertConversationToMessages(conversation);

  expect(result[1].content[0]).toEqual({
    type: 'tool-result',
    toolCallId: 'tool-1',
    result: 'file1.txt\nfile2.txt',
  });
});
```

**Step 4: Run test**

```bash
npm test src/utils/__tests__/conversationTransform.test.ts
```

Expected: PASS - 3 tests passing

**Step 5: Write test for token usage preservation**

Add to test file:

```typescript
it('should preserve token usage in metadata', () => {
  const prompt: Prompt = {
    id: 'prompt-4',
    sessionId: 'session-1',
    content: 'Test prompt',
    createdAt: new Date('2025-01-01'),
    status: 'completed',
  };

  const message: BackendMessage = {
    type: 'assistant',
    uuid: 'msg-4',
    message: {
      id: 'msg-4',
      role: 'assistant',
      content: [{ type: 'text', text: 'Response' }],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 25,
      },
    },
    session_id: 'session-1',
  };

  const conversation: ConversationItem[] = [
    {
      type: 'prompt',
      data: prompt,
      messages: [message],
    },
  ];

  const result = convertConversationToMessages(conversation);

  expect(result[1].metadata).toEqual({
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 25,
    },
  });
});
```

**Step 6: Run test**

```bash
npm test src/utils/__tests__/conversationTransform.test.ts
```

Expected: PASS - 4 tests passing

**Step 7: Commit**

```bash
git add src/utils/__tests__/conversationTransform.test.ts
git commit -m "test: add comprehensive tests for conversation transformation"
```

---

## Task 4: Create Custom Message Components

**Files:**

- Create: `src/components/chat/PromptMessage.tsx`
- Create: `src/components/chat/ToolCallDisplay.tsx`
- Create: `src/components/chat/MessageContent.tsx`

**Step 1: Create PromptMessage component**

Create `src/components/chat/PromptMessage.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';
import { AssistantMessage } from '@/utils/conversationTransform';

interface PromptMessageProps {
  message: AssistantMessage;
}

export function PromptMessage({ message }: PromptMessageProps) {
  const textContent = message.content.find((c) => c.type === 'text');
  const status = message.metadata?.status || 'pending';

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-indigo-900">Prompt</span>
        <Badge
          variant="outline"
          className={
            status === 'completed'
              ? 'bg-green-50 text-green-700 border-green-300'
              : status === 'processing'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : status === 'failed'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-gray-50 text-gray-700 border-gray-300'
          }
        >
          {status}
        </Badge>
      </div>
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg border-l-4 border-indigo-500">
        <p className="text-sm whitespace-pre-wrap text-gray-800 break-words">
          {textContent?.text || ''}
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Create ToolCallDisplay component**

Create `src/components/chat/ToolCallDisplay.tsx`:

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  args: any;
  result?: any;
}

export function ToolCallDisplay({
  toolName,
  args,
  result,
}: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white/50 rounded border border-gray-200 my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full p-2 text-left hover:bg-gray-50"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="text-xs font-medium text-gray-700">
          Tool: {toolName}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          <div>
            <p className="text-xs text-gray-600 mb-1">Input:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full bg-gray-50 p-2 rounded">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {result !== undefined && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Result:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full bg-gray-50 p-2 rounded">
                {typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create MessageContent component**

Create `src/components/chat/MessageContent.tsx`:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ToolCallDisplay } from './ToolCallDisplay';
import { AssistantMessage } from '@/utils/conversationTransform';

interface MessageContentProps {
  message: AssistantMessage;
}

export function MessageContent({ message }: MessageContentProps) {
  return (
    <div
      className={`p-3 rounded-lg ${
        message.role === 'user'
          ? 'bg-gray-50'
          : message.role === 'assistant'
            ? 'bg-blue-50'
            : 'bg-purple-50'
      }`}
    >
      <div className="text-sm space-y-2">
        {message.content.map((content, idx) => {
          if (content.type === 'text') {
            return (
              <div
                key={`${message.id}-text-${idx}`}
                className="markdown-content prose prose-sm max-w-none break-words"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            maxWidth: '100%',
                            overflowX: 'auto',
                            wordBreak: 'break-word',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-gray-100 px-1 py-0.5 rounded text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content.text || ''}
                </ReactMarkdown>
              </div>
            );
          }

          if (content.type === 'tool-call') {
            return (
              <ToolCallDisplay
                key={`${message.id}-tool-${idx}`}
                toolName={content.toolName || ''}
                args={content.args}
              />
            );
          }

          if (content.type === 'tool-result') {
            return (
              <div
                key={`${message.id}-result-${idx}`}
                className="bg-white/50 p-2 rounded border border-gray-200"
              >
                <p className="text-xs text-gray-600 mb-1">Tool Result</p>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                  {typeof content.result === 'string'
                    ? content.result
                    : JSON.stringify(content.result, null, 2)}
                </pre>
              </div>
            );
          }

          return null;
        })}

        {message.metadata?.usage && (
          <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
            Tokens: {message.metadata.usage.input_tokens} in /{' '}
            {message.metadata.usage.output_tokens} out
            {message.metadata.usage.cache_read_input_tokens &&
              ` / ${message.metadata.usage.cache_read_input_tokens} cached`}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/components/chat/
git commit -m "feat: add custom message display components"
```

---

## Task 5: Create Custom Thread Component

**Files:**

- Create: `src/components/chat/SessionThread.tsx`

**Step 1: Create SessionThread component**

Create `src/components/chat/SessionThread.tsx`:

```typescript
import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationItem } from '@/hooks/useMessages';
import { convertConversationToMessages } from '@/utils/conversationTransform';
import { PromptMessage } from './PromptMessage';
import { MessageContent } from './MessageContent';

interface SessionThreadProps {
  conversation: ConversationItem[];
  isLoading: boolean;
}

export function SessionThread({
  conversation,
  isLoading,
}: SessionThreadProps) {
  const messages = useMemo(
    () => convertConversationToMessages(conversation),
    [conversation]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No conversation yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {messages.map((message) =>
          message.metadata?.isPrompt ? (
            <PromptMessage key={message.id} message={message} />
          ) : (
            <div key={message.id}>
              <div className="flex items-center mb-2">
                <span className="font-medium capitalize text-sm">
                  {message.role}
                </span>
              </div>
              <MessageContent message={message} />
            </div>
          )
        )}
      </div>
    </ScrollArea>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/chat/SessionThread.tsx
git commit -m "feat: add SessionThread component"
```

---

## Task 6: Update SessionDetail to Use New Components

**Files:**

- Modify: `src/components/SessionDetail.tsx`

**Step 1: Replace chatscope imports with new components**

In `src/components/SessionDetail.tsx`, replace the chatscope imports:

```typescript
// Remove these lines:
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
} from '@chatscope/chat-ui-kit-react';

// Add these:
import { SessionThread } from './chat/SessionThread';
```

**Step 2: Replace the chat container section**

Replace lines 108-341 in SessionDetail.tsx with:

```typescript
      {/* Chat Container */}
      <div className="flex-1 min-h-0">
        <SessionThread
          conversation={conversation || []}
          isLoading={isLoading}
        />

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
```

**Step 3: Run the dev server to test**

```bash
npm run dev
```

Open browser and navigate to a session detail page. Verify:

- Messages display correctly
- Tool blocks are collapsible
- No overflow issues
- Submit button is visible

**Step 4: Commit**

```bash
git add src/components/SessionDetail.tsx
git commit -m "feat: integrate SessionThread into SessionDetail"
```

---

## Task 7: Update SessionDetail Tests

**Files:**

- Modify: `src/components/__tests__/SessionDetail.test.tsx`

**Step 1: Update test to work with new components**

Read the existing test file and update mocks if needed. The test should still pass since we're using the same data structure from useSessionConversation.

```bash
npm test src/components/__tests__/SessionDetail.test.tsx
```

**Step 2: Fix any failing tests**

If tests fail, update them to match the new component structure. The key changes:

- No more chatscope Message components
- Using ScrollArea instead of MainContainer
- Message structure is the same

**Step 3: Commit**

```bash
git add src/components/__tests__/SessionDetail.test.tsx
git commit -m "test: update SessionDetail tests for new chat components"
```

---

## Task 8: Remove Chatscope Dependencies

**Files:**

- Modify: `package.json`
- Modify: `src/components/SessionDetail.tsx` (verify no imports remain)

**Step 1: Search for any remaining chatscope imports**

```bash
grep -r "@chatscope" src/
```

Expected: Only package.json should be found

**Step 2: Uninstall chatscope packages**

```bash
npm uninstall @chatscope/chat-ui-kit-react @chatscope/chat-ui-kit-styles
```

**Step 3: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove chatscope dependencies"
```

---

## Task 9: Run Pre-Submission Checks

**Files:**

- All files

**Step 1: Run linter**

```bash
npm run lint
```

Expected: No errors

**Step 2: Fix any linting issues**

If errors exist:

```bash
npm run lint:fix
```

**Step 3: Run formatter**

```bash
npm run format
```

Expected: Files formatted

**Step 4: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 5: Commit formatting/lint fixes if any**

```bash
git add .
git commit -m "chore: fix linting and formatting"
```

---

## Task 10: Manual Testing

**Files:**

- None (manual testing)

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test the following scenarios:**

1. Navigate to a session with messages
2. Verify messages display correctly
3. Expand/collapse tool blocks
4. Scroll through conversation
5. Verify submit button is visible at bottom
6. Send a new message
7. Verify no overflow issues
8. Check responsive behavior (resize window)

**Step 3: Document any issues found**

If issues found, create new tasks to fix them before completing.

---

## Success Criteria

- [ ] No layout overflow issues
- [ ] Submit button always visible
- [ ] Tool blocks are collapsible and clean
- [ ] Better spacing and density
- [ ] All existing functionality preserved
- [ ] All tests pass
- [ ] Linter and formatter pass
- [ ] No console errors

## Notes

- The transformation function preserves all data (tokens, status, tool info)
- Tool blocks now collapse by default to reduce clutter
- ScrollArea component from shadcn handles overflow automatically
- No backend changes required
- Existing hooks (useSessionConversation) work unchanged
