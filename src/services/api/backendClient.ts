import { HttpClient } from '../http/types';
import { Session, Message } from '../../types/session';
import {
  BackendClient,
  CreateSessionData,
  UpdateSessionData,
  ListSessionsParams,
} from './types';

/**
 * Converts snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts camelCase string to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively converts object keys from snake_case to camelCase
 */
function keysToCamel(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(keysToCamel);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = snakeToCamel(key);
      acc[camelKey] = keysToCamel(obj[key]);
      return acc;
    }, {} as any);
  }

  return obj;
}

/**
 * Recursively converts object keys from camelCase to snake_case
 */
function keysToSnake(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(keysToSnake);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = camelToSnake(key);
      acc[snakeKey] = keysToSnake(obj[key]);
      return acc;
    }, {} as any);
  }

  return obj;
}

/**
 * Implementation of the BackendClient interface.
 * Uses dependency injection to accept any HTTP client implementation.
 */
export class BackendClientImpl implements BackendClient {
  constructor(private httpClient: HttpClient) {}

  sessions = {
    list: async (params?: ListSessionsParams): Promise<Session[]> => {
      const response = await this.httpClient.get<any[]>('/api/sessions', {
        params,
      });
      return this.deserializeSessions(response.data);
    },

    get: async (id: string): Promise<Session> => {
      const response = await this.httpClient.get<any>(`/api/sessions/${id}`);
      return this.deserializeSession(response.data);
    },

    create: async (data: CreateSessionData): Promise<Session> => {
      const snakeData = keysToSnake(data);
      const response = await this.httpClient.post<any>(
        '/api/sessions',
        snakeData
      );
      return this.deserializeSession(response.data);
    },

    update: async (id: string, data: UpdateSessionData): Promise<Session> => {
      const snakeData = keysToSnake(data);
      const response = await this.httpClient.patch<any>(
        `/api/sessions/${id}`,
        snakeData
      );
      return this.deserializeSession(response.data);
    },

    delete: async (id: string): Promise<void> => {
      await this.httpClient.delete(`/api/sessions/${id}`);
    },

    archive: async (id: string): Promise<Session> => {
      const response = await this.httpClient.post<any>(
        `/api/sessions/${id}/archive`
      );
      return this.deserializeSession(response.data);
    },

    unarchive: async (id: string): Promise<Session> => {
      const response = await this.httpClient.post<any>(
        `/api/sessions/${id}/unarchive`
      );
      return this.deserializeSession(response.data);
    },
  };

  prompts = {
    list: async (sessionId: string) => {
      const response = await this.httpClient.get<any[]>(
        `/api/sessions/${sessionId}/prompts`
      );
      return this.deserializePrompts(response.data);
    },

    create: async (sessionId: string, content: string) => {
      const response = await this.httpClient.post<any>(
        `/api/sessions/${sessionId}/prompts`,
        { content }
      );
      return this.deserializePrompt(response.data);
    },
  };

  messages = {
    list: async (promptId: string) => {
      const response = await this.httpClient.get<any>(
        `/api/prompts/${promptId}/messages`
      );
      // Return BackendMessage[] structure - only convert snake_case to camelCase
      const messages = response.data.messages || response.data;
      return this.deserializeBackendMessages(messages);
    },

    create: async (sessionId: string, content: string): Promise<Message> => {
      const response = await this.httpClient.post<any>(
        `/api/sessions/${sessionId}/messages`,
        {
          content,
        }
      );
      return this.deserializeMessage(response.data);
    },
  };

  /**
   * Deserializes a single session, converting snake_case to camelCase and date strings to Date objects
   */
  private deserializeSession(session: any): Session {
    const camelSession = keysToCamel(session);
    return {
      ...camelSession,
      createdAt: new Date(camelSession.createdAt),
      messages: camelSession.messages
        ? this.deserializeMessages(camelSession.messages)
        : null,
      children: camelSession.children
        ? this.deserializeSessions(camelSession.children)
        : undefined,
    };
  }

  /**
   * Deserializes an array of sessions
   */
  private deserializeSessions(sessions: any[]): Session[] {
    return sessions.map((session) => this.deserializeSession(session));
  }

  /**
   * Deserializes a single message, converting snake_case to camelCase and date strings to Date objects
   */
  private deserializeMessage(message: any): Message {
    const camelMessage = keysToCamel(message);
    return {
      ...camelMessage,
      createdAt: new Date(camelMessage.createdAt),
    };
  }

  /**
   * Deserializes an array of messages
   */
  private deserializeMessages(messages: any[]): Message[] {
    return messages.map((message) => this.deserializeMessage(message));
  }

  /**
   * Deserializes a single prompt
   */
  private deserializePrompt(prompt: any) {
    const camelPrompt = keysToCamel(prompt);
    return {
      ...camelPrompt,
      createdAt: new Date(camelPrompt.createdAt),
    };
  }

  /**
   * Deserializes an array of prompts
   */
  private deserializePrompts(prompts: any[]) {
    return prompts.map((prompt) => this.deserializePrompt(prompt));
  }

  /**
   * Deserializes BackendMessage[] - preserves the nested structure with tool calls
   */
  private deserializeBackendMessages(messages: any[]) {
    return messages.map((msg) => {
      // Convert snake_case to camelCase recursively, preserving the full structure
      const camelMsg = keysToCamel(msg);

      // The API wraps BackendMessage in { id, prompt_id, data: BackendMessage, created_at, updated_at }
      // We need to unwrap the 'data' field to match the BackendMessage type
      return camelMsg.data || camelMsg;
    });
  }
}
