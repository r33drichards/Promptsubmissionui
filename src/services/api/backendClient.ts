import { HttpClient } from '../http/types';
import { Session, Message } from '../../types/session';
import {
  BackendClient,
  CreateSessionData,
  UpdateSessionData,
  ListSessionsParams,
} from './types';

/**
 * Implementation of the BackendClient interface.
 * Uses dependency injection to accept any HTTP client implementation.
 */
export class BackendClientImpl implements BackendClient {
  constructor(private httpClient: HttpClient) {}

  sessions = {
    list: async (params?: ListSessionsParams): Promise<Session[]> => {
      const response = await this.httpClient.get<Session[]>('/sessions', {
        params,
      });
      return this.deserializeSessions(response.data);
    },

    get: async (id: string): Promise<Session> => {
      const response = await this.httpClient.get<Session>(`/sessions/${id}`);
      return this.deserializeSession(response.data);
    },

    create: async (data: CreateSessionData): Promise<Session> => {
      const response = await this.httpClient.post<Session>('/sessions', data);
      return this.deserializeSession(response.data);
    },

    update: async (id: string, data: UpdateSessionData): Promise<Session> => {
      const response = await this.httpClient.patch<Session>(`/sessions/${id}`, data);
      return this.deserializeSession(response.data);
    },

    delete: async (id: string): Promise<void> => {
      await this.httpClient.delete(`/sessions/${id}`);
    },

    archive: async (id: string): Promise<Session> => {
      const response = await this.httpClient.patch<Session>(`/sessions/${id}`, {
        archived: true,
      });
      return this.deserializeSession(response.data);
    },

    unarchive: async (id: string): Promise<Session> => {
      const response = await this.httpClient.patch<Session>(`/sessions/${id}`, {
        archived: false,
      });
      return this.deserializeSession(response.data);
    },
  };

  messages = {
    list: async (sessionId: string): Promise<Message[]> => {
      const response = await this.httpClient.get<Message[]>(`/sessions/${sessionId}/messages`);
      return this.deserializeMessages(response.data);
    },

    create: async (sessionId: string, content: string): Promise<Message> => {
      const response = await this.httpClient.post<Message>(`/sessions/${sessionId}/messages`, {
        content,
      });
      return this.deserializeMessage(response.data);
    },
  };

  /**
   * Deserializes a single session, converting date strings to Date objects
   */
  private deserializeSession(session: any): Session {
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      messages: session.messages ? this.deserializeMessages(session.messages) : null,
      children: session.children ? this.deserializeSessions(session.children) : undefined,
    };
  }

  /**
   * Deserializes an array of sessions
   */
  private deserializeSessions(sessions: any[]): Session[] {
    return sessions.map((session) => this.deserializeSession(session));
  }

  /**
   * Deserializes a single message, converting date strings to Date objects
   */
  private deserializeMessage(message: any): Message {
    return {
      ...message,
      timestamp: new Date(message.timestamp),
    };
  }

  /**
   * Deserializes an array of messages
   */
  private deserializeMessages(messages: any[]): Message[] {
    return messages.map((message) => this.deserializeMessage(message));
  }
}
