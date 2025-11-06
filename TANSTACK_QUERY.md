# TanStack Query Integration

This document describes the TanStack Query (React Query) integration for managing server state, caching, and mutations.

## Overview

TanStack Query provides:

- **Automatic Caching**: Data is cached and reused across components
- **Background Refetching**: Keeps data fresh automatically
- **Optimistic Updates**: UI updates instantly, rolls back on error
- **Request Deduplication**: Multiple components requesting the same data trigger only one request
- **Loading & Error States**: Built-in state management for async operations
- **Mutation Management**: Powerful hooks for creating, updating, and deleting data
- **DevTools**: Visual debugging of queries and cache

## Architecture

```
┌─────────────────────────────────────────────┐
│         QueryProvider (main.tsx)            │
│    - Configures QueryClient                │
│    - Provides DevTools                      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│      Custom Hooks (src/hooks/)              │
│                                             │
│  Queries:                                   │
│  - useSessions()      (list sessions)       │
│  - useSession()       (get session)         │
│  - useMessages()      (list messages)       │
│                                             │
│  Mutations:                                 │
│  - useCreateSession()                       │
│  - useUpdateSession()                       │
│  - useArchiveSession()                      │
│  - useUnarchiveSession()                    │
│  - useDeleteSession()                       │
│  - useCreateMessage()                       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│     Backend Client (via ApiProvider)        │
│  - Makes actual HTTP requests               │
│  - Returns typed responses                  │
└─────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── hooks/
│   ├── queryKeys.ts              # Centralized query key management
│   ├── useSessions.ts            # Session query hooks
│   ├── useSessionMutations.ts   # Session mutation hooks
│   ├── useMessages.ts           # Message query & mutation hooks
│   └── index.ts                 # Barrel exports
└── providers/
    └── QueryProvider.tsx        # TanStack Query setup
```

## Query Keys

Query keys are centralized in `src/hooks/queryKeys.ts` for consistent cache management:

```typescript
export const queryKeys = {
  sessions: {
    all: ["sessions"],
    lists: () => [...queryKeys.sessions.all, "list"],
    list: (params?: ListSessionsParams) => [
      ...queryKeys.sessions.lists(),
      params,
    ],
    details: () => [...queryKeys.sessions.all, "detail"],
    detail: (id: string) => [...queryKeys.sessions.details(), id],
  },
  messages: {
    all: ["messages"],
    lists: () => [...queryKeys.messages.all, "list"],
    list: (sessionId: string) => [...queryKeys.messages.lists(), sessionId],
  },
};
```

This structure allows for:

- **Granular invalidation**: Invalidate specific queries or entire groups
- **Type safety**: Keys are strongly typed
- **Consistency**: Same keys used across the app

## Usage Examples

### Fetching Data (Queries)

#### List Sessions with Filters

```tsx
import { useSessions } from "./hooks";

function SessionList() {
  const {
    data: sessions,
    isLoading,
    error,
  } = useSessions({
    archived: false,
    status: "pending",
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {sessions?.map((session) => (
        <div key={session.id}>{session.title}</div>
      ))}
    </div>
  );
}
```

#### Get Single Session

```tsx
import { useSession } from "./hooks";

function SessionDetail({ id }: { id: string }) {
  const { data: session, isLoading } = useSession(id);

  if (isLoading) return <div>Loading...</div>;

  return <div>{session?.title}</div>;
}
```

#### Fetch Messages for a Session

```tsx
import { useMessages } from "./hooks";

function MessageList({ sessionId }: { sessionId: string }) {
  const { data: messages, isLoading } = useMessages(sessionId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {messages?.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### Mutating Data (Mutations)

#### Create a New Session

```tsx
import { useCreateSession } from "./hooks";

function CreateSessionButton() {
  const createSession = useCreateSession();

  const handleCreate = () => {
    createSession.mutate(
      {
        title: "Fix bug in login",
        repo: "owner/repo",
        branch: "feature/fix-login",
        targetBranch: "main",
      },
      {
        onSuccess: (newSession) => {
          console.log("Created:", newSession);
          // Navigate to the new session or update UI
        },
      }
    );
  };

  return (
    <button onClick={handleCreate} disabled={createSession.isPending}>
      {createSession.isPending ? "Creating..." : "Create Session"}
    </button>
  );
}
```

#### Update a Session

```tsx
import { useUpdateSession } from "./hooks";

function UpdateStatusButton({ sessionId }: { sessionId: string }) {
  const updateSession = useUpdateSession();

  const handleComplete = () => {
    updateSession.mutate({
      id: sessionId,
      data: { inboxStatus: "completed" },
    });
  };

  return (
    <button onClick={handleComplete} disabled={updateSession.isPending}>
      Mark Complete
    </button>
  );
}
```

#### Archive a Session (with Optimistic Update)

```tsx
import { useArchiveSession } from "./hooks";

function ArchiveButton({ sessionId }: { sessionId: string }) {
  const archiveSession = useArchiveSession();

  const handleArchive = () => {
    archiveSession.mutate(sessionId, {
      onSuccess: () => {
        // Session is automatically updated in cache
        // UI reflects change immediately (optimistic update)
      },
    });
  };

  return (
    <button onClick={handleArchive} disabled={archiveSession.isPending}>
      Archive
    </button>
  );
}
```

#### Create a Message (with Optimistic Update)

```tsx
import { useCreateMessage } from "./hooks";

function MessageInput({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState("");
  const createMessage = useCreateMessage(sessionId);

  const handleSend = () => {
    createMessage.mutate(message, {
      onSuccess: () => {
        setMessage(""); // Clear input
        // Message appears instantly in UI (optimistic)
        // Rolled back if server returns error
      },
    });
  };

  return (
    <div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={handleSend} disabled={createMessage.isPending}>
        Send
      </button>
    </div>
  );
}
```

## Advanced Features

### Optimistic Updates

Several mutations include optimistic updates for better UX:

- **useUpdateSession**: Updates cache immediately, rolls back on error
- **useArchiveSession**: Shows archived state instantly
- **useCreateMessage**: Message appears immediately in chat

Example from `useUpdateSession`:

```typescript
onMutate: async ({ id, data }) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey: queryKeys.sessions.detail(id) });

  // Snapshot previous value
  const previousSession = queryClient.getQueryData(queryKeys.sessions.detail(id));

  // Optimistically update
  if (previousSession) {
    queryClient.setQueryData(queryKeys.sessions.detail(id), {
      ...previousSession,
      ...data,
    });
  }

  return { previousSession }; // For rollback
},
onError: (error, variables, context) => {
  // Rollback on error
  if (context?.previousSession) {
    queryClient.setQueryData(
      queryKeys.sessions.detail(variables.id),
      context.previousSession
    );
  }
},
```

### Cache Invalidation

Mutations automatically invalidate related queries:

```typescript
// After creating a session
queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });

// After updating a session
queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(id) });
queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });
```

### Loading States

All hooks provide loading states:

```tsx
const { data, isLoading, isFetching, error } = useSessions();

// isLoading: true on first fetch
// isFetching: true on any fetch (including background refetch)
// error: contains error if request failed
```

For mutations:

```tsx
const mutation = useCreateSession();

// mutation.isPending: true while request is in progress
// mutation.isSuccess: true if mutation succeeded
// mutation.isError: true if mutation failed
// mutation.error: contains error details
```

### Error Handling

Errors are automatically handled with toast notifications, but you can add custom handling:

```tsx
const createSession = useCreateSession({
  onError: (error) => {
    // Custom error handling
    console.error("Failed to create session:", error);
    // Show custom error UI
  },
});
```

## React Query DevTools

DevTools are included in development mode. Access them by:

1. Look for the React Query logo in the bottom-left corner of your app
2. Click to expand and inspect:
   - Active queries and their status
   - Cached data
   - Query keys
   - Refetch behavior
   - Network activity

You can manually trigger refetches, clear cache, and inspect query state.

## Configuration

The QueryClient is configured in `src/providers/QueryProvider.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - cache time
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch on focus
      refetchOnMount: true, // Refetch if stale on mount
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});
```

You can customize these defaults as needed.

## Best Practices

1. **Use Query Keys Consistently**: Always use the centralized `queryKeys` object
2. **Handle Loading States**: Show loading indicators for better UX
3. **Optimistic Updates**: Use for instant feedback on mutations
4. **Error Boundaries**: Wrap components in error boundaries to catch query errors
5. **Invalidate Wisely**: Only invalidate what needs to be refetched
6. **Use Mutations for Side Effects**: Don't mutate data directly in queries
7. **Leverage DevTools**: Use in development to debug cache behavior

## Integration with Backend Client

TanStack Query works seamlessly with the backend client:

```typescript
// Hook implementation
export function useSessions(params?: ListSessionsParams) {
  const api = useApi(); // Get backend client from context

  return useQuery({
    queryKey: queryKeys.sessions.list(params),
    queryFn: () => api.sessions.list(params), // Use backend client
  });
}
```

The backend client handles:

- HTTP requests
- Serialization/deserialization
- Error formatting

TanStack Query handles:

- Caching
- Refetching
- Loading states
- Optimistic updates

## Migrating from Local State

Before (local state):

```tsx
const [sessions, setSessions] = useState<Session[]>([]);

useEffect(() => {
  api.sessions.list().then(setSessions);
}, []);

const createSession = async (data) => {
  const newSession = await api.sessions.create(data);
  setSessions([...sessions, newSession]);
};
```

After (TanStack Query):

```tsx
const { data: sessions = [] } = useSessions();
const createSession = useCreateSession();

// Just call mutation - cache updates automatically
createSession.mutate(data);
```

Benefits:

- No manual state management
- Automatic cache invalidation
- Built-in loading/error states
- Optimistic updates
- Request deduplication

## Troubleshooting

### Query Not Refetching

Check if data is stale:

```tsx
const { data, isStale } = useSessions();
console.log("Is stale:", isStale);
```

Manually refetch:

```tsx
const { data, refetch } = useSessions();
<button onClick={() => refetch()}>Refresh</button>;
```

### Mutation Not Updating UI

Ensure cache is being invalidated:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists() });
};
```

### Multiple Requests for Same Data

This should not happen with TanStack Query's request deduplication. Check DevTools to see if multiple queries are using different keys.

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
