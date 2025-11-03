# Routing Architecture

## Overview

This application uses React Router v6 for client-side routing to enable URL-based navigation for sessions. The routing architecture allows for deep linking, browser history navigation, and shareable URLs.

## Route Structure

The application defines two main routes:

- **`/`** - Home/Empty state
  - Displays the session list in the sidebar
  - Shows an empty state message in the content area: "Select a task to view details"
  - Available actions: Create new task

- **`/session/:id`** - Session detail view
  - Displays the session list in the sidebar with the selected session highlighted
  - Shows full session details in the content area (repository, messages, hierarchy)
  - Available actions: Create subtask, archive session, view messages
  - The `:id` parameter is the unique session identifier (UUID)

## URL as Source of Truth

The selected session is **derived from the URL parameter**, not stored in local component state. This architectural decision provides several benefits:

### Benefits

1. **Deep Linking**: Users can bookmark or share direct links to specific sessions
2. **Browser Navigation**: Back/forward buttons work naturally
3. **Refresh Stability**: Refreshing the page maintains the current session view
4. **Simplified State Management**: No need to sync URL with local state
5. **Testability**: Easy to test specific routes in isolation

### Implementation

```tsx
// Selected session is computed from URL params
const { id } = useParams();
const selectedSession = useMemo(() => {
  if (!id) return null;
  return sessions.find(s => s.id === id) || null;
}, [id, sessions]);
```

No local state for `selectedSession` - it's always derived from the URL.

## Navigation Patterns

### Navigating to a Session

When a user clicks a session in the sidebar:

```tsx
navigate(`/session/${session.id}`)
```

This updates the URL, which triggers React Router to re-render with the new session ID, which updates the displayed session.

### Returning to Home

When clearing the selection (e.g., after archiving the current session):

```tsx
navigate('/')
```

### Creating a New Session

After successful session creation, navigate to the new session:

```tsx
onSuccess: (newSession) => {
  navigate(`/session/${newSession.id}`);
}
```

### Canceling Task Creation

When canceling task creation, preserve the current URL:

```tsx
const handleCancelCreate = () => {
  setIsCreatingTask(false);
  setParentForNewTask(null);
  // Don't navigate - stay on current URL
};
```

## Error Handling

### Invalid Session IDs

If a user navigates to an invalid session ID (e.g., `/session/invalid-uuid`), the application:

1. Attempts to find the session in the loaded sessions list
2. If not found after sessions have loaded, displays an error toast
3. Redirects to the home route (`/`)

Implementation:

```tsx
useEffect(() => {
  // Only check after sessions have loaded
  if (!isLoadingSessions && id && sessions.length > 0 && !selectedSession) {
    toast.error('Session not found');
    navigate('/');
  }
}, [id, sessions, selectedSession, navigate, isLoadingSessions]);
```

### Edge Cases

- **Direct navigation to session URL**: Works correctly - session loads from API
- **Refreshing on session page**: Session persists after refresh
- **Archived sessions**: If viewing a session when it's archived, user is redirected to home
- **Fast clicking**: Multiple rapid navigation actions are handled by React Router's state management

## Testing Approach

### Test Utilities

All tests wrap components with `MemoryRouter` to provide routing context:

```tsx
export function TestProviders({ children, client, queryClient }: TestProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <MemoryRouter>
      <QueryClientProvider client={testQueryClient}>
        <ApiProvider client={client}>{children}</ApiProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
```

### Routing Tests

Routing-specific tests use `createMemoryRouter` with initial entries to test navigation:

```tsx
const router = createMemoryRouter(
  [
    { path: '/', element: <App /> },
    { path: '/session/:id', element: <App /> },
  ],
  { initialEntries: ['/'] } // Start at home
);

render(<RouterProvider router={router} />, { client: mockClient });

// Verify navigation
expect(router.state.location.pathname).toBe('/session/session-1');
```

### Test Coverage

Tests verify:
- URL navigation when clicking sessions
- Direct navigation to session URLs
- Invalid session ID redirect
- Empty state at root path
- Browser back/forward navigation
- Archive flow navigation
- Create session navigation
- Cancel preserves URL

## Architecture Decisions

### Why React Router v6?

- Industry standard for React routing
- Built-in support for nested routes (if needed in future)
- Strong TypeScript support
- Active maintenance and community

### Why URL-Driven State?

- **Single Source of Truth**: URL is the authoritative source for which session is selected
- **User Experience**: Enables browser features (back/forward, bookmarks, share)
- **Simplicity**: Eliminates sync issues between URL and local state
- **Testability**: Easy to test by setting initial route

### Why Not Nested Routes?

The current implementation uses a flat route structure with a single `AppLayout` component for both routes. This follows YAGNI (You Aren't Gonna Need It):

- No need for route guards or middleware
- No complex nested routing logic
- Simple and maintainable
- Can be extended later if needed

## Future Considerations

### Potential Enhancements

- **Query Parameters**: Add filtering/search to URL (e.g., `?filter=active&search=test`)
- **Nested Routes**: If subtask views need separate URLs (e.g., `/session/:id/subtask/:subtaskId`)
- **Route Guards**: If authentication is added
- **Loading States**: Suspense boundaries for route transitions

### Breaking Changes to Avoid

- Changing URL structure would break bookmarked links
- Consider versioning URLs if major routing changes are needed
- Maintain backwards compatibility for shared links

## Related Documentation

- [React Router v6 Documentation](https://reactrouter.com/)
- [Session Management Architecture](./sessions.md) (if exists)
- [Testing Guidelines](../testing.md) (if exists)
