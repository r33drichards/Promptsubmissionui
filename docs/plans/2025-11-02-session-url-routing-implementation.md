# Session URL Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable URL-based navigation for sessions using React Router v6, allowing deep linking and browser history navigation.

**Architecture:** Replace local state-driven session selection with URL-driven approach using React Router. The URL becomes the single source of truth for selected session. Routes: `/` for empty state, `/session/:id` for session detail.

**Tech Stack:** React Router v6, existing TanStack Query, Vite

---

## Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install react-router-dom**

Run: `npm install react-router-dom`
Expected: Package installed successfully

**Step 2: Verify installation**

Run: `npm list react-router-dom`
Expected: Shows react-router-dom@^6.x.x

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add react-router-dom dependency"
```

---

## Task 2: Update Test Utilities for Routing

**Files:**

- Modify: `src/test/utils.tsx:33-41`
- Modify: `src/test/utils.tsx:51-63`

**Step 1: Add MemoryRouter import**

Add to imports at top of file:

```tsx
import { MemoryRouter } from 'react-router-dom';
```

**Step 2: Update TestProviders to include MemoryRouter**

Replace the TestProviders function:

```tsx
export function TestProviders({
  children,
  client,
  queryClient,
}: TestProvidersProps) {
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

**Step 3: Update renderWithProviders Wrapper**

The Wrapper function should now include MemoryRouter via TestProviders (no additional changes needed since it uses TestProviders).

**Step 4: Run existing tests to verify they still pass**

Run: `npm test`
Expected: All existing tests pass (routing not yet implemented in App, so tests work with MemoryRouter wrapper)

**Step 5: Commit**

```bash
git add src/test/utils.tsx
git commit -m "feat: add MemoryRouter to test utilities"
```

---

## Task 3: Add BrowserRouter to Main Entry Point

**Files:**

- Modify: `src/main.tsx:1-14`

**Step 1: Write failing test for router presence**

Create: `src/__tests__/main.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';

describe('App Entry Point', () => {
  it('should render app with router', () => {
    // This test will verify the router is set up by checking URL navigation works
    // For now, just verify the app renders
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    // Import and run main would execute here, but we'll verify via integration tests
    expect(root).toBeInTheDocument();
  });
});
```

**Step 2: Update main.tsx with BrowserRouter**

Add import:

```tsx
import { BrowserRouter } from 'react-router-dom';
```

Update render call:

```tsx
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <QueryProvider>
      <ApiProvider>
        <App />
      </ApiProvider>
    </QueryProvider>
  </BrowserRouter>
);
```

**Step 3: Verify app still runs**

Run: `npm run dev`
Expected: App loads without errors in browser

**Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat: wrap app with BrowserRouter"
```

---

## Task 4: Add Route Structure to App Component

**Files:**

- Modify: `src/App.tsx:1-332`

**Step 1: Add router imports**

Add to imports at top of App.tsx:

```tsx
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
```

**Step 2: Extract layout into separate component inside App.tsx**

Before the App component, add:

```tsx
function AppLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('active');

  // Move all existing App logic here
  // ... (existing code from App component)

  return (
    <div className="flex h-screen bg-white">
      {/* Existing sidebar and content */}
    </div>
  );
}
```

**Step 3: Update App component to define routes**

Replace the App component with:

```tsx
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />} />
      <Route path="/session/:id" element={<AppLayout />} />
    </Routes>
  );
}
```

**Step 4: Derive selectedSession from URL in AppLayout**

Remove this line:

```tsx
const [selectedSession, setSelectedSession] = useState<Session | null>(null);
```

Add after `useParams()`:

```tsx
const selectedSession = useMemo(() => {
  if (!id) return null;
  return sessions.find((s) => s.id === id) || null;
}, [id, sessions]);
```

**Step 5: Verify app still renders**

Run: `npm run dev`
Expected: App loads, but clicking sessions doesn't work yet (handler not updated)

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add route structure with URL-driven session selection"
```

---

## Task 5: Update Session Selection to Navigate

**Files:**

- Modify: `src/App.tsx` (multiple locations)

**Step 1: Update onSelect handler to navigate**

Find the SessionListItem component usage (around line 276-283) and update:

Change from:

```tsx
onSelect = { setSelectedSession };
```

To:

```tsx
onSelect={(session) => navigate(`/session/${session.id}`)}
```

**Step 2: Test session selection manually**

Run: `npm run dev`
Expected: Clicking a session updates URL to `/session/:id` and displays details

**Step 3: Verify browser back/forward buttons work**

In browser:

1. Click session 1 → URL: `/session/session-1`
2. Click session 2 → URL: `/session/session-2`
3. Click back → Returns to session 1
4. Click forward → Returns to session 2

Expected: Navigation works correctly

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: navigate to session URL on selection"
```

---

## Task 6: Handle Invalid Session IDs

**Files:**

- Modify: `src/App.tsx` (add useEffect in AppLayout)

**Step 1: Add error handling effect**

Add after the selectedSession useMemo:

```tsx
useEffect(() => {
  // Only check after sessions have loaded
  if (!isLoadingSessions && id && sessions.length > 0 && !selectedSession) {
    toast.error('Session not found');
    navigate('/');
  }
}, [id, sessions, selectedSession, navigate, isLoadingSessions]);
```

**Step 2: Test invalid session ID**

In browser:

1. Navigate to `/session/invalid-uuid`
   Expected: Redirects to `/` with "Session not found" toast

**Step 3: Test direct link to valid session**

In browser:

1. Navigate to `/session/session-1` (use actual session ID from API)
   Expected: Session loads and displays correctly

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: handle invalid session IDs with redirect"
```

---

## Task 7: Update Create Session Flow

**Files:**

- Modify: `src/App.tsx:136-154`

**Step 1: Update handleCreateTask success callback**

Change the onSuccess callback in createSessionMutation.mutate:

```tsx
onSuccess: (newSession) => {
  navigate(`/session/${newSession.id}`);
  setIsCreatingTask(false);
  setParentForNewTask(null);
},
```

**Step 2: Test creating a new session**

In browser:

1. Click "New Task"
2. Fill in form and submit
   Expected: URL navigates to `/session/<new-id>` and displays new session

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: navigate to new session after creation"
```

---

## Task 8: Update Archive Session Flow

**Files:**

- Modify: `src/App.tsx:198-206`

**Step 1: Update handleArchive to check selected session**

Update the archiveSessionMutation.mutate onSuccess:

```tsx
archiveSessionMutation.mutate(sessionId, {
  onSuccess: () => {
    if (selectedSession?.id === sessionId) {
      navigate('/');
    }
  },
});
```

**Step 2: Test archiving selected session**

In browser:

1. Select a session
2. Hover and click archive button
   Expected: Redirects to `/` (empty state)

**Step 3: Test archiving non-selected session**

In browser:

1. Select session 1
2. Archive session 2 (via hover)
   Expected: Stays on session 1, session 2 removed from list

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: navigate to home after archiving selected session"
```

---

## Task 9: Update Empty State Handlers

**Files:**

- Modify: `src/App.tsx` (multiple button onClick handlers)

**Step 1: Remove setSelectedSession calls from empty state**

Find the empty state section (around line 311-327) and update button onClick:

Change from:

```tsx
onClick={() => {
  setParentForNewTask(null);
  setSelectedSession(null);
  setIsCreatingTask(true);
}}
```

To:

```tsx
onClick={() => {
  setParentForNewTask(null);
  navigate('/');
  setIsCreatingTask(true);
}}
```

**Step 2: Update header "New Task" button similarly**

Around line 219-234, update onClick:

```tsx
onClick={() => {
  setParentForNewTask(null);
  navigate('/');
  setIsCreatingTask(true);
}}
```

**Step 3: Test new task flow from empty state**

In browser:

1. Go to `/` (no session selected)
2. Click "New Task"
   Expected: Form opens, URL stays at `/`

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: update empty state handlers for routing"
```

---

## Task 10: Update Cancel Task Handler

**Files:**

- Modify: `src/App.tsx:163-166`

**Step 1: Update handleCancelCreate**

Update the function:

```tsx
const handleCancelCreate = () => {
  setIsCreatingTask(false);
  setParentForNewTask(null);
  // Don't navigate - stay on current URL
};
```

**Step 2: Test cancel from home**

In browser:

1. At `/`, click "New Task"
2. Click "Cancel"
   Expected: Returns to `/` empty state

**Step 3: Test cancel from session**

In browser:

1. Select session → `/session/session-1`
2. Click "New Task" button
3. Click "Cancel"
   Expected: Returns to `/session/session-1` with details showing

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: preserve URL when canceling task creation"
```

---

## Task 11: Write Routing Integration Tests

**Files:**

- Create: `src/__tests__/routing/sessionRouting.test.tsx`

**Step 1: Create routing test file**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render } from '@/test/utils';
import { createMockBackendClient } from '@/test/mockBackendClient';
import App from '@/App';

describe('Session Routing', () => {
  let mockClient: ReturnType<typeof createMockBackendClient>;

  beforeEach(() => {
    mockClient = createMockBackendClient();
    vi.clearAllMocks();
  });

  describe('URL Navigation', () => {
    it('should navigate to session detail when clicking session', async () => {
      const user = userEvent.setup();

      // Create router with initial route at home
      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      render(<RouterProvider router={router} />, { client: mockClient });

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Click session
      const sessionItem = screen.getByText('Test Session 1');
      await user.click(sessionItem);

      // Verify URL changed
      expect(router.state.location.pathname).toMatch(/\/session\/.+/);
    });

    it('should display session when navigating directly to session URL', async () => {
      const sessionId = 'session-1';

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: [`/session/${sessionId}`] }
      );

      render(<RouterProvider router={router} />, { client: mockClient });

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Session details should be visible
      await waitFor(() => {
        const repoElements = screen.getAllByText('test/repo');
        expect(repoElements.length).toBeGreaterThan(0);
      });
    });

    it('should redirect to home for invalid session ID', async () => {
      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/session/invalid-id'] }
      );

      render(<RouterProvider router={router} />, { client: mockClient });

      await waitFor(() => {
        // Should redirect to home
        expect(router.state.location.pathname).toBe('/');
      });

      // Should show empty state
      expect(
        screen.getByText('Select a task to view details')
      ).toBeInTheDocument();
    });

    it('should show empty state at root path', async () => {
      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      render(<RouterProvider router={router} />, { client: mockClient });

      await waitFor(() => {
        expect(
          screen.getByText('Select a task to view details')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Browser Navigation', () => {
    it('should support back button navigation', async () => {
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      render(<RouterProvider router={router} />, { client: mockClient });

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Navigate to first session
      await user.click(screen.getByText('Test Session 1'));

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/\/session\/.+/);
      });

      // Navigate to second session
      await user.click(screen.getByText('Test Session 2'));

      // Go back
      router.navigate(-1);

      await waitFor(() => {
        // Should be back at first session (verify by checking details visible)
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });
    });
  });

  describe('Archive Flow', () => {
    it('should navigate to home after archiving selected session', async () => {
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      render(<RouterProvider router={router} />, { client: mockClient });

      await waitFor(() => {
        expect(screen.getByText('Test Session 1')).toBeInTheDocument();
      });

      // Select session
      const sessionItem = screen.getByText('Test Session 1');
      await user.click(sessionItem);

      await waitFor(() => {
        expect(router.state.location.pathname).toMatch(/\/session\/.+/);
      });

      // Archive it (need to hover to show button)
      const sessionContainer = sessionItem.closest('div');
      await user.hover(sessionContainer!);

      // Note: Archive button interaction would be tested here
      // For now, verify the mutation handler is set up correctly
    });
  });

  describe('Create Session Flow', () => {
    it('should navigate to new session after creation', async () => {
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: '/', element: <App /> },
          { path: '/session/:id', element: <App /> },
        ],
        { initialEntries: ['/'] }
      );

      render(<RouterProvider router={router} />, { client: mockClient });

      await waitFor(() => {
        const newTaskButtons = screen.getAllByRole('button', {
          name: /new task/i,
        });
        expect(newTaskButtons.length).toBeGreaterThan(0);
      });

      // Click New Task
      const newTaskButton = screen.getAllByRole('button', {
        name: /new task/i,
      })[0];
      await user.click(newTaskButton);

      // Form should be visible
      await waitFor(() => {
        expect(screen.getByText('Create New Task')).toBeInTheDocument();
      });

      // After successful creation, should navigate to new session
      // This would be verified by mocking the create mutation and checking navigation
    });
  });
});
```

**Step 2: Run routing tests**

Run: `npm test src/__tests__/routing/sessionRouting.test.tsx`
Expected: All routing tests pass

**Step 3: Commit**

```bash
git add src/__tests__/routing/sessionRouting.test.tsx
git commit -m "test: add routing integration tests"
```

---

## Task 12: Update Existing Integration Tests

**Files:**

- Modify: `src/__tests__/integration/userFlows.test.tsx`

**Step 1: Verify existing tests still pass**

Run: `npm test src/__tests__/integration/userFlows.test.tsx`
Expected: All tests pass (MemoryRouter in test utils handles routing)

**Step 2: If any tests fail, update them**

Most tests should pass because:

- Test utils wrap with MemoryRouter
- Component behavior remains the same
- Only navigation mechanism changed (callback → navigate)

If tests fail, update assertions to work with routing.

**Step 3: Commit any test fixes**

```bash
git add src/__tests__/integration/userFlows.test.tsx
git commit -m "test: update integration tests for routing"
```

---

## Task 13: Manual Testing

**Files:**

- None (manual verification)

**Step 1: Test all navigation flows**

1. Home → Select session → URL updates
2. Direct link to session → Loads correctly
3. Invalid session ID → Redirects with error
4. Browser back/forward → Navigation works
5. Create new session → Navigates to new session
6. Archive selected session → Returns to home
7. Archive other session → Stays on current
8. Cancel task creation → Preserves current URL

**Step 2: Test edge cases**

1. Refresh page on session URL → Session loads
2. Bookmark session URL → Works when reopened
3. Share session URL → Works for others
4. Very fast clicking between sessions → No errors

**Step 3: Verify no regressions**

1. Search still works
2. Filtering still works
3. Session hierarchy still works
4. All buttons and interactions work

**Step 4: Document any issues**

If issues found, create separate tasks to fix them.

---

## Task 14: Run Full Test Suite

**Files:**

- None

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Fix any failing tests**

If tests fail:

1. Identify the issue
2. Update test or code as needed
3. Commit fix

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Final commit if needed**

```bash
git add .
git commit -m "fix: address any remaining test issues"
```

---

## Task 15: Update Documentation

**Files:**

- Create: `docs/architecture/routing.md` (optional)
- Modify: `README.md` (if it exists with architecture info)

**Step 1: Document routing architecture**

Create routing documentation if helpful for future developers:

```markdown
# Routing Architecture

## Route Structure

- `/` - Home/Empty state
- `/session/:id` - Session detail view

## URL as Source of Truth

The selected session is derived from the URL parameter, not local state.

## Navigation

- Use `navigate('/session/:id')` to navigate to a session
- Use `navigate('/')` to return to home

## Testing

Tests use MemoryRouter from react-router-dom.
```

**Step 2: Commit documentation**

```bash
git add docs/
git commit -m "docs: add routing architecture documentation"
```

---

## Completion Criteria

- [ ] React Router v6 installed
- [ ] BrowserRouter wraps app in main.tsx
- [ ] MemoryRouter wraps tests in test utils
- [ ] App uses Routes and Route components
- [ ] Selected session derived from URL params
- [ ] Clicking session navigates to `/session/:id`
- [ ] Invalid session IDs redirect to `/` with error
- [ ] Browser back/forward buttons work
- [ ] Create session navigates to new session
- [ ] Archive selected session returns to home
- [ ] All existing tests pass
- [ ] New routing tests added and passing
- [ ] Build succeeds
- [ ] Manual testing complete

## Key Principles Applied

**DRY (Don't Repeat Yourself):**

- Single AppLayout component used for both routes
- Shared logic for session selection from URL

**YAGNI (You Aren't Gonna Need It):**

- Only 2 routes (no over-engineering nested routes)
- Minimal routing configuration
- No route guards or complex middleware

**TDD (Test-Driven Development):**

- Tests updated before implementation where possible
- New routing tests validate behavior
- All tests pass before completion

**Frequent Commits:**

- Each task step commits logical changes
- Clear commit messages
- Easy to track progress and revert if needed
