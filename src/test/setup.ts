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
vi.mock('@assistant-ui/react', () => {
  let currentRuntime: any = null;

  return {
    AssistantRuntimeProvider: ({ children, runtime }: any) => {
      currentRuntime = runtime;
      return children;
    },
    useAssistantRuntime: () => currentRuntime,
    useExternalStoreRuntime: (adapter: any) => {
      return {
        messages: adapter.messages || [],
        isLoading: adapter.isLoading || false,
        onNew: adapter.onNew || (() => {}),
      };
    },
    makeAssistantToolUI: vi.fn(),
    useThreadContext: () => ({
      useThread: () => ({
        messages: currentRuntime?.messages || [],
        isLoading: currentRuntime?.isLoading || false,
      }),
    }),
  };
});

// Mock @assistant-ui/react-ui components for tests
// Simple mock that just renders a placeholder div
vi.mock('@assistant-ui/react-ui', () => ({
  Thread: ({ className }: any) => {
    return React.createElement(
      'div',
      { className, 'data-testid': 'assistant-thread' },
      React.createElement('div', null, 'Thread component placeholder')
    );
  },
}));
