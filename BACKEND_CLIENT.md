# Backend Client Architecture

This document describes the backend client architecture, which follows dependency injection and interface-based design patterns for flexible and testable API communication.

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          React Components (App.tsx)         │
│                                             │
│         const api = useApi()                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         ApiProvider (React Context)         │
│                                             │
│  - Provides BackendClient to all children  │
│  - Allows client injection                 │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│        BackendClientImpl (API Layer)        │
│                                             │
│  - sessions.list(), create(), update()     │
│  - messages.list(), create()               │
│  - Handles serialization/deserialization   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         HttpClient (Transport Layer)        │
│                                             │
│  Mock: MockHttpClient (dev/testing)        │
│  Real: OpenAPIClient (production)          │
└─────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── services/
│   ├── http/
│   │   ├── types.ts          # HttpClient interface, HttpResponse, HttpError
│   │   ├── mockClient.ts     # Mock implementation for development
│   │   └── index.ts          # Barrel exports
│   ├── api/
│   │   ├── types.ts          # BackendClient interface, request/response types
│   │   ├── backendClient.ts  # BackendClientImpl implementation
│   │   └── index.ts          # Barrel exports
│   └── index.ts              # Barrel exports
└── providers/
    └── ApiProvider.tsx       # React Context for dependency injection
```

## Core Components

### 1. HTTP Client Layer (`services/http/`)

**HttpClient Interface** defines the contract for making HTTP requests:

```typescript
interface HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
  post<T>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>>;
  put<T>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>>;
  patch<T>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
}
```

**MockHttpClient** provides a development/testing implementation:

- Simulates network delays (500ms default)
- Returns mock responses based on URL patterns
- Logs requests to console for debugging
- Can be easily replaced with real implementation

### 2. Backend API Layer (`services/api/`)

**BackendClient Interface** defines all backend operations:

```typescript
interface BackendClient {
  sessions: {
    list(params?: ListSessionsParams): Promise<Session[]>;
    get(id: string): Promise<Session>;
    create(data: CreateSessionData): Promise<Session>;
    update(id: string, data: UpdateSessionData): Promise<Session>;
    delete(id: string): Promise<void>;
    archive(id: string): Promise<Session>;
    unarchive(id: string): Promise<Session>;
  };
  messages: {
    list(sessionId: string): Promise<Message[]>;
    create(sessionId: string, content: string): Promise<Message>;
  };
}
```

**BackendClientImpl** implementation:

- Accepts any `HttpClient` via constructor injection
- Handles serialization/deserialization (e.g., Date objects)
- Provides type-safe API methods

### 3. React Context Provider (`providers/ApiProvider.tsx`)

**ApiProvider** component:

- Uses React Context to provide `BackendClient` to all children
- Supports dependency injection via `client` prop
- Creates default mock client if none provided

**useApi** hook:

- Provides access to the backend client from any component
- Throws error if used outside ApiProvider

## Usage Examples

### Basic Usage in Components

```typescript
import { useApi } from './providers/ApiProvider';

function MyComponent() {
  const api = useApi();

  const loadSessions = async () => {
    try {
      const sessions = await api.sessions.list({ status: 'pending' });
      console.log(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  return <button onClick={loadSessions}>Load Sessions</button>;
}
```

### Creating a Session

```typescript
const api = useApi();

const createTask = async () => {
  const newSession = await api.sessions.create({
    repo: "owner/repo",
    targetBranch: "main",
    messages: { content: "Fix bug in login" },
    parentId: null, // Optional: null for root-level sessions
  });

  console.log("Created session:", newSession);
  // Note: title and branch are auto-generated by the backend
};
```

### Updating a Session

```typescript
const api = useApi();

const updateSession = async (id: string) => {
  const updated = await api.sessions.update(id, {
    inboxStatus: "completed",
    prUrl: "https://github.com/owner/repo/pull/123",
  });

  console.log("Updated session:", updated);
};
```

### Archiving a Session

```typescript
const api = useApi();

const archiveSession = async (id: string) => {
  await api.sessions.archive(id);
  console.log("Session archived");
};
```

## Replacing the Mock Client

When you're ready to use a real HTTP client (e.g., generated from OpenAPI), follow these steps:

### Option 1: Custom HTTP Client

Create your own `HttpClient` implementation:

```typescript
// services/http/axiosClient.ts
import axios, { AxiosInstance } from "axios";
import { HttpClient, HttpResponse, HttpError, RequestConfig } from "./types";

export class AxiosHttpClient implements HttpClient {
  constructor(private axiosInstance: AxiosInstance) {}

  async get<T>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ... implement other methods

  private handleError(error: any): HttpError {
    if (axios.isAxiosError(error)) {
      return new HttpError(
        error.message,
        error.response?.status || 500,
        error.response?.data
      );
    }
    return new HttpError("Unknown error", 500);
  }
}
```

### Option 2: OpenAPI Generated Client

If your OpenAPI client has a compatible interface:

```typescript
// services/http/openApiClient.ts
import { DefaultApi, Configuration } from "./generated"; // Your OpenAPI client
import { HttpClient } from "./types";

// Adapter to make OpenAPI client compatible with HttpClient interface
export class OpenApiHttpClient implements HttpClient {
  private client: DefaultApi;

  constructor(basePath: string) {
    this.client = new DefaultApi(new Configuration({ basePath }));
  }

  // Map OpenAPI client methods to HttpClient interface
  // ...
}
```

### Injecting the Real Client

Update `main.tsx` to inject your real client:

```typescript
import { ApiProvider } from './providers/ApiProvider';
import { BackendClientImpl } from './services/api/backendClient';
import { AxiosHttpClient } from './services/http/axiosClient';
import axios from 'axios';

// Create real HTTP client
const axiosInstance = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

const httpClient = new AxiosHttpClient(axiosInstance);
const backendClient = new BackendClientImpl(httpClient);

createRoot(document.getElementById("root")!).render(
  <ApiProvider client={backendClient}>
    <App />
  </ApiProvider>
);
```

## Benefits of This Architecture

1. **Dependency Injection**: Easy to swap implementations for testing or production
2. **Type Safety**: Full TypeScript support with interfaces
3. **Separation of Concerns**: Clear separation between HTTP layer and API layer
4. **Testability**: Mock clients can be easily injected for unit tests
5. **Flexibility**: Can work with any HTTP client (axios, fetch, OpenAPI-generated, etc.)
6. **Maintainability**: Single source of truth for API operations
7. **Error Handling**: Centralized error handling and response processing

## API Reference

See the following files for detailed type definitions:

- **HTTP Client**: `src/services/http/types.ts`
- **Backend API**: `src/services/api/types.ts`
- **Session Types**: `src/types/session.ts`

## Testing

The mock client logs all requests to the console. Check the browser console to see:

```
[MockHttpClient] POST /sessions { data: {...}, config: {...} }
[MockHttpClient] GET /sessions { config: {...} }
```

This helps verify that API calls are being made correctly before connecting to a real backend.
