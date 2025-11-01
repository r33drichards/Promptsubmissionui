# Testing Guide

This project uses Vitest and React Testing Library for testing. This guide will help you understand the testing setup and how to write tests.

## Running Tests

```bash
# Run tests in watch mode (default)
npm test

# Run tests once (CI mode)
npm test -- --run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

### Test Utilities (`src/test/`)

- **`setup.ts`**: Global test setup, mocks for browser APIs
- **`utils.tsx`**: Custom render function with providers, test utilities
- **`mockBackendClient.ts`**: Mock backend client for testing

### Test Organization

```
src/
├── test/                          # Test utilities
│   ├── setup.ts
│   ├── utils.tsx
│   └── mockBackendClient.ts
├── __tests__/                     # Integration tests
│   └── integration/
│       └── userFlows.test.tsx
├── components/                    # UI components
│   └── __tests__/                 # Component tests
│       ├── CreateTaskForm.test.tsx
│       └── SessionDetail.test.tsx
└── services/                      # Services
    └── api/
        └── __tests__/             # API tests
            └── backendClient.test.ts
```

## Writing Tests

### Component Tests

Use the custom `render` function from `src/test/utils.tsx` to wrap components with necessary providers:

```tsx
import { render, screen } from '@/test/utils';
import { createMockBackendClient } from '@/test/mockBackendClient';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const mockClient = createMockBackendClient();

    render(<MyComponent />, { client: mockClient });

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### API Tests

For testing API boundaries:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { BackendClientImpl } from '../backendClient';

describe('BackendClient', () => {
  it('should fetch sessions', async () => {
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({ data: [] }),
      // ... other methods
    };

    const client = new BackendClientImpl(mockHttpClient);
    const sessions = await client.sessions.list();

    expect(sessions).toEqual([]);
  });
});
```

### Integration Tests

For testing complete user flows:

```tsx
import { render, screen, waitFor } from '@/test/utils';
import { createMockBackendClient } from '@/test/mockBackendClient';
import userEvent from '@testing-library/user-event';
import App from '@/App';

describe('User Flow', () => {
  it('should create a new task', async () => {
    const user = userEvent.setup();
    const mockClient = createMockBackendClient();

    render(<App />, { client: mockClient });

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Claude Code')).toBeInTheDocument();
    });

    // Click new task button
    const newTaskBtn = screen.getByRole('button', { name: /new task/i });
    await user.click(newTaskBtn);

    // Fill in form and submit
    // ...
  });
});
```

## Mock Backend Client

The `createMockBackendClient` function creates a fully mocked backend client with default test data:

```tsx
import { createMockBackendClient } from '@/test/mockBackendClient';

// Default mock client with test data
const mockClient = createMockBackendClient();

// Override specific methods
const customClient = createMockBackendClient({
  sessions: {
    list: vi.fn().mockResolvedValue([/* custom data */]),
  },
});

// Create error mock client
import { createErrorMockBackendClient } from '@/test/mockBackendClient';
const errorClient = createErrorMockBackendClient();
```

## Testing Best Practices

### 1. Use Testing Library Queries Properly

Prefer queries in this order:
1. `getByRole` - Most accessible
2. `getByLabelText` - For form fields
3. `getByPlaceholderText` - For inputs
4. `getByText` - For static text
5. `getByTestId` - Last resort

### 2. Use User Events

Always use `@testing-library/user-event` instead of `fireEvent`:

```tsx
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
```

### 3. Wait for Async Updates

Use `waitFor` for async state changes:

```tsx
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### 4. Test User Behavior, Not Implementation

❌ Bad: Testing implementation details
```tsx
expect(component.state.isOpen).toBe(true);
```

✅ Good: Testing user-visible behavior
```tsx
expect(screen.getByText('Modal Content')).toBeInTheDocument();
```

### 5. Mock External Dependencies

Always mock external dependencies (HTTP clients, browser APIs, etc.):

```tsx
const mockHttpClient = {
  get: vi.fn().mockResolvedValue({ data: [] }),
  post: vi.fn(),
  // ...
};
```

## Coverage

Coverage reports are generated in the `coverage/` directory. To view them:

```bash
npm run test:coverage
open coverage/index.html
```

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions. See `.github/workflows/test.yml` for configuration.

## Troubleshooting

### Tests Timing Out

Increase timeout for slow tests:

```tsx
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Mock Not Working

Clear mocks between tests:

```tsx
beforeEach(() => {
  vi.clearAllMocks();
});
```

### React Query Cache Issues

Use a fresh QueryClient for each test (already handled by our test utils):

```tsx
const queryClient = createTestQueryClient();
render(<App />, { queryClient });
```
