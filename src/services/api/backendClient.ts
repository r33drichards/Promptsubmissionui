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

  messages = {
    list: async (sessionId: string): Promise<Message[]> => {
      const response = await this.httpClient.get<any[]>(
        `/api/sessions/${sessionId}/messages`
      );
      return this.deserializeMessages(response.data);
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
   * Maps backend status values to our InboxStatus type
   */
  private mapInboxStatus(status: string): Session['inboxStatus'] {
    // Handle both formats: lowercase-with-hyphens and Capitalized
    const normalizedStatus = status.toLowerCase().replace(/-/g, '');

    const statusMap: Record<string, Session['inboxStatus']> = {
      // Capitalized format (from actual API)
      pending: 'pending',
      active: 'in-progress',
      completed: 'completed',
      archived: 'completed',
      failed: 'failed',
      // Lowercase with hyphens (from tests and old API)
      inprogress: 'in-progress',
    };

    return statusMap[normalizedStatus] || 'pending';
  }

  /**
   * Deserializes a single session, converting snake_case to camelCase and date strings to Date objects
   */
  private deserializeSession(session: any): Session {
    const camelSession = keysToCamel(session);

    // Handle API field name differences
    // API returns 'session_status' but we expect 'inboxStatus'
    const rawStatus = camelSession.inboxStatus || camelSession.sessionStatus;
    const inboxStatus =
      typeof rawStatus === 'string'
        ? this.mapInboxStatus(rawStatus)
        : 'pending';

    return {
      ...camelSession,
      inboxStatus,
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
}
