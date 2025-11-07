# Chat UI Migration: chatscope to assistant-ui

**Date:** 2025-11-06
**Status:** Approved for Implementation

## Problem Statement

The current chat interface using `@chatscope/chat-ui-kit-react` has several visual and functional issues:

- Tool execution blocks are cluttered and difficult to read
- Overall spacing and density feels cramped
- Layout overflow causes the submit button to render offscreen
- Inconsistent spacing throughout the chat interface

## Solution Overview

Migrate from `@chatscope/chat-ui-kit-react` to `@assistant-ui/react`, a purpose-built library for AI chat interfaces that:

- Handles auto-scrolling and overflow automatically
- Provides better default spacing and density
- Renders tool blocks cleanly with built-in collapsible support
- Integrates seamlessly with our existing shadcn/ui components
- Has 200k+ monthly downloads and active development

## Architecture

### Component Hierarchy

```
SessionDetail (existing wrapper)
├── Session Header (unchanged)
├── AssistantRuntimeProvider (new - assistant-ui provider)
│   └── Thread Component
│       ├── ThreadPrimitive.Viewport (auto-scroll container)
│       │   └── ThreadPrimitive.Messages
│       │       ├── PromptMessage (custom: render initial prompts)
│       │       ├── AssistantMessage (with tool rendering)
│       │       └── UserMessage
│       └── ComposerPrimitive (replaces Textarea + Button)
└── Action Buttons (PR creation - unchanged)
```

### Custom Runtime

Since we use a custom backend (not Vercel AI SDK), we'll implement:

- `useLocalRuntime()` hook that wraps our existing `useSessionConversation()` data
- Data transformation layer to convert our message format to assistant-ui format
- No backend API changes required

### Data Transformation

**Source Format (Current):**

```typescript
conversation: Array<{
  data: { content: string; status: string };
  messages: Array<{
    uuid: string;
    type: 'user' | 'assistant' | 'system';
    message: {
      content: Array<{
        type: 'text' | 'tool_use' | 'tool_result';
        text?: string;
        name?: string;
        input?: any;
        content?: any;
      }>;
      usage?: { input_tokens; output_tokens; cache_read_input_tokens };
    };
  }>;
}>;
```

**Target Format (Assistant-UI):**

```typescript
Array<{
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
}>;
```

**Transformation Rules:**

1. Flatten the nested conversation structure
2. Map prompt items as system messages with special styling
3. Transform tool_use → tool-call with toolName and args
4. Transform tool_result → tool-result with result
5. Preserve token counts in message metadata

## Implementation Strategy

### Phase 1: Dependencies

- Install `@assistant-ui/react`
- Keep `@chatscope/chat-ui-kit-react` temporarily for comparison
- Add transformation utilities

### Phase 2: Data Layer

- Create `convertConversationToMessages()` function
- Write comprehensive tests for transformation logic
- Handle edge cases (missing fields, nested content)

### Phase 3: Component Migration

- Create custom Thread component
- Implement PromptMessage, AssistantMessage, UserMessage
- Add ComposerPrimitive for message input
- Preserve existing functionality (PR creation, status badges)

### Phase 4: Styling

- Use assistant-ui's styled primitives
- Customize with Tailwind classes for brand consistency
- Ensure responsive behavior

### Phase 5: Cleanup

- Remove chatscope dependencies
- Update tests
- Verify all functionality preserved

## Testing Strategy

- Unit tests for `convertConversationToMessages()` transformation
- Component tests for custom message renderers
- Integration tests for full chat flow
- Visual regression testing (manual)

## Success Criteria

- [ ] No layout overflow issues
- [ ] Submit button always visible
- [ ] Tool blocks are clean and readable
- [ ] Better overall spacing and density
- [ ] All existing functionality preserved
- [ ] Tests pass with good coverage
- [ ] Linter and formatter pass

## Rollback Plan

If issues arise, we can:

1. Revert to chatscope implementation (git revert)
2. Keep both libraries temporarily during migration
3. Feature flag the new UI for gradual rollout

## References

- assistant-ui GitHub: https://github.com/assistant-ui/assistant-ui
- assistant-ui docs: https://www.assistant-ui.com/docs
- Current implementation: src/components/SessionDetail.tsx
