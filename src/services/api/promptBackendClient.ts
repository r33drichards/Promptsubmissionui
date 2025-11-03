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
  private getAccessToken: () => string | null;

  constructor(basePath?: string, getAccessToken?: () => string | null) {
    this.getAccessToken = getAccessToken || (() => null);

    // Create middleware to inject auth headers dynamically
    const authMiddleware = {
      pre: async (context: any) => {
        const token = this.getAccessToken();
        if (token) {
          context.init.headers = {
            ...context.init.headers,
            'Authorization': `Bearer ${token}`,
          };
        }
        return context;
      },
    };

    const config = new Configuration({
      basePath: basePath || import.meta.env.VITE_BACKEND_URL || 'https://prompt-backend-production.up.railway.app',
      middleware: [authMiddleware],
    });
    this.api = new DefaultApi(config);
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
      };
    }
    return {};
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
      console.log('[PromptBackendClient] Creating session with data:', data);

      // Validate required fields
      if (!data.repo || data.repo.trim() === '') {
        throw new Error('Repository is required to create a session');
      }
      if (!data.targetBranch || data.targetBranch.trim() === '') {
        throw new Error('Target branch is required to create a session');
      }

      // Create the session - backend will auto-generate title, branch, and set defaults
      const response = await this.api.handlersSessionsCreate({
        createSessionInput: {
          repo: data.repo,
          targetBranch: data.targetBranch,
          messages: data.messages || null,
          parent: data.parentId || null,
        },
      });

      console.log('[PromptBackendClient] Create response:', response);

      if (!response || !response.id) {
        console.error('[PromptBackendClient] Invalid response structure:', response);
        throw new Error('Failed to create session: Invalid response from backend');
      }

      // Fetch the full session data
      return this.sessions.get(response.id);
    },

    update: async (id: string, data: UpdateSessionData): Promise<Session> => {
      console.log('[PromptBackendClient] Updating session:', id, 'with data:', data);

      // Get the current session first to merge with update data
      const currentSession = await this.sessions.get(id);
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
        repo: data.repo !== undefined ? data.repo : currentSession.repo || null,
        branch: data.branch !== undefined ? data.branch : currentSession.branch || null,
        targetBranch: data.targetBranch !== undefined ? data.targetBranch : currentSession.targetBranch || null,
      };
      console.log('[PromptBackendClient] Update input:', updateInput);

      const response = await this.api.handlersSessionsUpdate({
        id,
        updateSessionInput: updateInput,
      });
      console.log('[PromptBackendClient] Update response:', response);

      // Fetch the updated session data
      return this.sessions.get(id);
    },

    delete: async (id: string): Promise<void> => {
      await this.api.handlersSessionsDelete({ id });
    },

    archive: async (id: string): Promise<Session> => {
      console.log('[PromptBackendClient] Archiving session:', id);
      try {
        const result = await this.sessions.update(id, { sessionStatus: 'Archived' });
        console.log('[PromptBackendClient] Archive successful:', result);
        return result;
      } catch (error) {
        console.error('[PromptBackendClient] Archive failed:', error);
        throw error;
      }
    },

    unarchive: async (id: string): Promise<Session> => {
      return this.sessions.update(id, { sessionStatus: 'Active' });
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
    if (!session) {
      throw new Error('Cannot deserialize null or undefined session');
    }

    // Extract repo, branch, and targetBranch from sbxConfig if they exist there
    const sbxConfig = session.sbxConfig || {};
    const repo = session.repo || sbxConfig.repo || '';
    const branch = session.branch || sbxConfig.branch || '';
    const targetBranch = session.targetBranch || sbxConfig.targetBranch || 'main';

    return {
      id: session.id || '',
      title: session.title || '',
      repo,
      branch,
      targetBranch,
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
