import '@testing-library/jest-dom';
import { expect as _expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Mock OIDC library for tests
vi.mock('@axa-fr/react-oidc', () => ({
  useOidcAccessToken: () => ({
    accessToken: 'mock-access-token',
    accessTokenPayload: {
      sub: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
  }),
  useOidc: () => ({
    isAuthenticated: true,
    logout: vi.fn(),
    login: vi.fn(),
  }),
  OidcProvider: ({ children }: any) => children,
  OidcSecure: ({ children }: any) => children,
}));

// Mock Monaco Editor component for tests
vi.mock('../components/MonacoEditor', () => ({
  MonacoEditor: ({ value, onChange, placeholder }: any) =>
    React.createElement('textarea', {
      'aria-label': 'Prompt',
      value,
      onChange: (e: any) => onChange(e.target.value),
      placeholder,
      required: true,
    }),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock scrollIntoView (required for cmdk/Command component)
Element.prototype.scrollIntoView = vi.fn();

// Mock HTMLElement.prototype.hasPointerCapture
HTMLElement.prototype.hasPointerCapture = vi.fn();
HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock @assistant-ui/react components for tests
// Store the runtime data so the Thread mock can access it
let mockRuntimeMessages: any[] = [];
let mockIsLoading = false;

vi.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children, runtime }: any) => {
    // Store runtime data for Thread component
    if (runtime && runtime.messages) {
      mockRuntimeMessages = runtime.messages;
    }
    return children;
  },
  useAssistantRuntime: () => ({
    messages: mockRuntimeMessages,
    isLoading: mockIsLoading,
  }),
  useExternalStoreRuntime: (adapter: any) => {
    mockRuntimeMessages = adapter.messages || [];
    mockIsLoading = adapter.isLoading || false;
    return {
      messages: mockRuntimeMessages,
      isLoading: mockIsLoading,
    };
  },
  makeAssistantToolUI: vi.fn(),
}));

// Mock @assistant-ui/react-ui components for tests
vi.mock('@assistant-ui/react-ui', () => ({
  Thread: ({ className }: any) => {
    // Render messages from the mock runtime
    const hasMessages = mockRuntimeMessages && mockRuntimeMessages.length > 0;

    return React.createElement(
      'div',
      { className, 'data-testid': 'assistant-thread' },
      hasMessages
        ? mockRuntimeMessages.map((msg: any, idx: number) =>
            React.createElement(
              'div',
              { key: idx, 'data-role': msg.role },
              msg.content.map((c: any, cidx: number) =>
                c.type === 'text'
                  ? React.createElement('div', { key: cidx }, c.text)
                  : null
              )
            )
          )
        : React.createElement('div', null, 'No conversation yet')
    );
  },
}));
