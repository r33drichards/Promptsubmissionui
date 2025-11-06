# Session URL Routing Design

**Date:** 2025-11-02
**Status:** Approved

## Overview

Add URL-based navigation for sessions using React Router v6. When users select a session from the sidebar, the URL should update to `/session/<uuid>`, enabling deep linking, browser history navigation, and shareable session links.

## Current State

- No routing library installed
- Session selection managed via local state (`selectedSession` in App.tsx)
- URL remains static regardless of selected session
- Clicking a session in sidebar updates local state only

## Requirements

1. **URL Navigation**: Selecting a session should navigate to `/session/<uuid>`
2. **Browser Navigation**: Back/forward buttons should navigate between sessions
3. **Deep Linking**: Direct navigation to `/session/<uuid>` should auto-select that session
4. **Invalid Sessions**: Show error and redirect to `/` if session UUID doesn't exist
5. **New Session Creation**: URL should immediately update to `/session/<new-uuid>` after creation
6. **Empty State**: Root path `/` should display empty state (no session selected)

## Solution Architecture

### Route Structure

```
/ → Empty state (no session selected)
/session/:id → Session detail view
```

### Key Implementation Changes

#### 1. Dependencies

Add `react-router-dom` v6 to package.json:

```bash
npm install react-router-dom
```

#### 2. Main Entry Point (main.tsx)

Wrap the app with `BrowserRouter`:

```tsx
import { BrowserRouter } from "react-router-dom";

<BrowserRouter>
  <App />
</BrowserRouter>;
```

#### 3. App Component Refactor

**Replace state-driven selection with URL-driven selection:**

```tsx
// Before: Local state
const [selectedSession, setSelectedSession] = useState<Session | null>(null);

// After: URL-driven
const { id } = useParams();
const navigate = useNavigate();
const selectedSession = id ? sessions.find((s) => s.id === id) : null;
```

**Add route definitions:**

```tsx
<Routes>
  <Route path="/" element={<AppLayout />} />
  <Route path="/session/:id" element={<AppLayout />} />
</Routes>
```

**Invalid session handling:**

```tsx
useEffect(() => {
  if (id && sessions.length > 0 && !selectedSession) {
    toast.error("Session not found");
    navigate("/");
  }
}, [id, sessions, selectedSession, navigate]);
```

#### 4. Navigation Updates

**Session selection (SessionListItem):**

```tsx
// Before
onClick={() => onSelect(session)}

// After
onClick={() => navigate(`/session/${session.id}`)}
```

**New session creation:**

```tsx
onSuccess: (newSession) => {
  navigate(`/session/${newSession.id}`);
  setIsCreatingTask(false);
  setParentForNewTask(null);
};
```

**Archive session:**

```tsx
onSuccess: () => {
  if (selectedSession?.id === sessionId) {
    navigate("/");
  }
};
```

#### 5. Component Structure

```
BrowserRouter (main.tsx)
└── App (contains Routes)
    └── AppLayout (shared sidebar + content area)
        ├── Sidebar (always visible)
        └── MainContent (changes based on route)
            ├── EmptyState (/)
            ├── CreateTaskForm (state-driven)
            └── SessionDetail (/session/:id)
```

## Data Flow

1. **User clicks session** → `navigate('/session/:id')` called
2. **URL updates** → React Router re-renders with new params
3. **`useParams()` reads ID** → Component derives `selectedSession` from sessions array
4. **Session found** → Render SessionDetail
5. **Session not found** → Show toast, redirect to `/`

## Error Handling

| Scenario                       | Behavior                                                |
| ------------------------------ | ------------------------------------------------------- |
| Invalid UUID in URL            | Show "Session not found" toast, redirect to `/`         |
| Session archived while viewing | Redirect to `/` on archive success                      |
| Direct link before data loads  | Wait for `isLoadingSessions` to complete, then validate |

## Testing Considerations

- Navigate directly to `/session/<valid-uuid>` → Session loads
- Navigate directly to `/session/<invalid-uuid>` → Redirects to `/` with error
- Click session in sidebar → URL updates, content loads
- Browser back button → Returns to previous session or `/`
- Browser forward button → Navigates forward through session history
- Archive current session → Returns to `/`
- Create new session → Navigates to `/session/<new-uuid>`

## Migration Notes

- No breaking changes to existing components beyond prop signature updates
- `setSelectedSession` callback replaced with `navigate()` calls
- All session selection logic moves from state management to URL management
- TanStack Query hooks remain unchanged

## Benefits

1. **Shareable Links**: Users can share session URLs
2. **Browser Integration**: Back/forward buttons work naturally
3. **Bookmarkable**: Sessions can be bookmarked
4. **User Experience**: Expected web navigation behavior
5. **State Persistence**: URL serves as single source of truth for selected session
