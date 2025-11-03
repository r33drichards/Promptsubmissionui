import { DefaultApi, Configuration, SessionStatus as SDKSessionStatus } from '@wholelottahoopla/prompt-backend-client';
import { Session, Message, SessionStatus } from '../../types/session';
import {
  BackendClient,
  CreateSessionData,
  UpdateSessionData,
  ListSessionsParams,
} from './types';

/**
 * Implementation of BackendClient using the @wholelottahoopla/prompt-backend-client package.
 * This adapter wraps the generated API client to match our BackendClient interface.
 */
export class PromptBackendClient implements BackendClient {
  private api: DefaultApi;

  constructor(basePath?: string) {
    const config = new Configuration({
      basePath: basePath || 'https://prompt-backend-production.up.railway.app',
    });
    this.api = new DefaultApi(config);
  }

  sessions = {
    list: async (params?: ListSessionsParams): Promise<Session[]> => {
      const response = await this.api.handlersSessionsList();
      // The response should contain an array of sessions
      // We need to transform the response to match our Session type
      return this.deserializeSessions(response.sessions || []);
    },

    get: async (id: string): Promise<Session> => {
      const response = await this.api.handlersSessionsRead({ id });
      return this.deserializeSession(response.session);
    },

    create: async (data: CreateSessionData): Promise<Session> => {
      const response = await this.api.handlersSessionsCreate({
        createSessionInput: {
          inboxStatus: this.mapInboxStatus(data.title ? 'pending' : 'pending'),
          messages: null,
          sbxConfig: data.sbxConfig || null,
          parent: data.parentId || null,
        },
      });
      return this.deserializeSession(response.session);
    },

    update: async (id: string, data: UpdateSessionData): Promise<Session> => {
      console.log('[PromptBackendClient] Updating session:', id, 'with data:', data);

      // Get the current session first to merge with update data
      const currentSession = await this.get(id);
      console.log('[PromptBackendClient] Current session:', currentSession);

      const updateInput = {
        id,
        inboxStatus: data.inboxStatus
          ? this.mapInboxStatus(data.inboxStatus)
          : this.mapInboxStatus(currentSession.inboxStatus),
        messages: currentSession.messages,
        sbxConfig: currentSession.sbxConfig,
        parent: currentSession.parentId,
        title: data.title !== undefined ? data.title : currentSession.title,
        sessionStatus: data.sessionStatus as SDKSessionStatus | undefined,
      };
      console.log('[PromptBackendClient] Update input:', updateInput);

      const response = await this.api.handlersSessionsUpdate({
        id,
        updateSessionInput: updateInput,
      });
      console.log('[PromptBackendClient] Update response:', response);
      return this.deserializeSession(response.session);
    },

    delete: async (id: string): Promise<void> => {
      await this.api.handlersSessionsDelete({ id });
    },

    archive: async (id: string): Promise<Session> => {
      console.log('[PromptBackendClient] Archiving session:', id);
      try {
        const result = await this.update(id, { sessionStatus: 'Archived' });
        console.log('[PromptBackendClient] Archive successful:', result);
        return result;
      } catch (error) {
        console.error('[PromptBackendClient] Archive failed:', error);
        throw error;
      }
    },

    unarchive: async (id: string): Promise<Session> => {
      return this.update(id, { sessionStatus: 'Active' });
    },
  };

  messages = {
    list: async (sessionId: string): Promise<Message[]> => {
      const response = await this.api.handlersItemsList();
      // The items API might be used for messages
      // This needs to be adjusted based on actual backend implementation
      return this.deserializeMessages(response.items || []);
    },

    create: async (sessionId: string, content: string): Promise<Message> => {
      const response = await this.api.handlersItemsCreate({
        createInput: {
          inboxStatus: 'Pending' as any,
          messages: content,
          sbxConfig: null,
          parent: sessionId,
        },
      });
      // This is a placeholder - actual implementation depends on backend
      return {
        id: response.item?.id || '',
        role: 'user',
        content,
        createdAt: new Date(),
      };
    },
  };

  /**
   * Maps our local InboxStatus to the backend's InboxStatus format
   */
  private mapInboxStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'in-progress': 'Active',
      'completed': 'Completed',
      'failed': 'Completed',
      'archived': 'Archived',
    };
    return statusMap[status] || 'Pending';
  }

  /**
   * Maps backend InboxStatus to our local format
   */
  private unmapInboxStatus(status: string): 'pending' | 'in-progress' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'in-progress' | 'completed' | 'failed'> = {
      'Pending': 'pending',
      'Active': 'in-progress',
      'Completed': 'completed',
      'Archived': 'completed',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Deserializes a single session from the backend format
   */
  private deserializeSession(session: any): Session {
    return {
      id: session.id || '',
      title: session.title || '',
      repo: session.repo || '',
      branch: session.branch || '',
      targetBranch: session.targetBranch || 'main',
      messages: session.messages ? this.deserializeMessages(session.messages) : null,
      inboxStatus: this.unmapInboxStatus(session.inboxStatus || 'Pending'),
      sbxConfig: session.sbxConfig || null,
      parentId: session.parent || null,
      createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
      diffStats: session.diffStats,
      prUrl: session.prUrl,
      sessionStatus: session.sessionStatus || 'Active',
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
   * Deserializes a single message
   */
  private deserializeMessage(message: any): Message {
    return {
      id: message.id || '',
      role: message.role || 'user',
      content: message.content || '',
      createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
    };
  }

  /**
   * Deserializes an array of messages
   */
  private deserializeMessages(messages: any[]): Message[] {
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages.map((message) => this.deserializeMessage(message));
  }
}
