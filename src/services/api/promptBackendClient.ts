import {
  DefaultApi,
  Configuration,
  SessionStatus as SDKSessionStatus,
  CreateSessionWithPromptInput,
  CreateSessionWithPromptOutput,
} from '@wholelottahoopla/prompt-backend-client';
import { Session, Message, SessionStatus } from '../../types/session';
import {
  BackendClient,
  CreateSessionData,
  UpdateSessionData,
  ListSessionsParams,
} from './types';
import {
  SessionSchema,
  SessionsArraySchema,
  MessageSchema,
  MessagesArraySchema,
  CreateSessionDataSchema,
} from '../../schemas/session';

/**
 * Implementation of BackendClient using the @wholelottahoopla/prompt-backend-client package.
 * This adapter wraps the generated API client to match our BackendClient interface.
 */
export class PromptBackendClient implements BackendClient {
  private api: DefaultApi;

  constructor(basePath?: string) {
    const config = new Configuration({
      basePath: basePath || import.meta.env.VITE_BACKEND_URL || 'https://prompt-backend-production.up.railway.app',
      credentials: 'include', // Required for Service Worker to inject Bearer tokens
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
      console.log('[PromptBackendClient] Creating session with data:', data);

      // Parse and validate input data using Zod (parse don't validate)
      const validatedData = CreateSessionDataSchema.parse(data);

      // Validate that messages are provided in the correct format
      if (!validatedData.messages || !Array.isArray(validatedData.messages) || validatedData.messages.length === 0) {
        console.error('[PromptBackendClient] Invalid messages format:', validatedData.messages);
        throw new Error('Messages must be provided as a non-empty array. Cannot create session without a prompt.');
      }

      // Create session with prompt using the combined endpoint
      console.log('[PromptBackendClient] Creating session with prompt using new endpoint');
      const response = await this.api.handlersSessionsCreateWithPrompt({
        createSessionWithPromptInput: {
          repo: validatedData.repo,
          targetBranch: validatedData.targetBranch,
          messages: validatedData.messages,
          parentId: validatedData.parentId || null,
        },
      });

      console.log('[PromptBackendClient] CreateWithPrompt response:', response);

      if (!response || !response.sessionId) {
        console.error('[PromptBackendClient] Invalid response structure:', response);
        throw new Error('Failed to create session with prompt: Invalid response from backend');
      }

      // Fetch the full session data
      return this.sessions.get(response.sessionId);
    },

    update: async (id: string, data: UpdateSessionData): Promise<Session> => {
      console.log('[PromptBackendClient] Updating session:', id, 'with data:', data);

      // Build update input with only the fields that are provided or need to be updated
      const updateInput: any = {
        id,
      };

      // Only include fields that are explicitly provided in the update data
      if (data.title !== undefined) updateInput.title = data.title;
      if (data.sessionStatus !== undefined) updateInput.sessionStatus = data.sessionStatus as SDKSessionStatus;
      if (data.repo !== undefined) updateInput.repo = data.repo;
      if (data.branch !== undefined) updateInput.branch = data.branch;
      if (data.targetBranch !== undefined) updateInput.targetBranch = data.targetBranch;

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
      // TODO: The new API structure has Prompts and Messages as separate entities.
      // Messages belong to Prompts, which belong to Sessions.
      // To implement this properly, we need to:
      // 1. List all prompts for the session
      // 2. For each prompt, list its messages
      // For now, we'll return an empty array as a placeholder
      console.warn('[PromptBackendClient] messages.list is not yet implemented for the new API structure');
      return [];
    },

    create: async (sessionId: string, content: string): Promise<Message> => {
      // TODO: The new API structure requires creating a Prompt first, then adding Messages to it.
      // This needs to be redesigned based on the app's requirements.
      console.error('[PromptBackendClient] messages.create is not yet implemented for the new API structure');
      throw new Error('messages.create is not yet implemented for the new API structure. Please use the Prompts API.');
    },
  };

  /**
   * Maps SessionStatus to our local InboxStatus format
   * Note: The new API uses SessionStatus instead of InboxStatus
   */
  private sessionStatusToInboxStatus(sessionStatus: string): 'pending' | 'in-progress' | 'completed' | 'failed' {
    const statusMap: Record<string, 'pending' | 'in-progress' | 'completed' | 'failed'> = {
      'Active': 'in-progress',
      'Archived': 'completed',
      'Completed': 'completed',
      // Add other mappings as needed based on SessionStatus enum
    };
    return statusMap[sessionStatus] || 'pending';
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

    // Map sessionStatus to inboxStatus for backwards compatibility
    const inboxStatus = this.sessionStatusToInboxStatus(session.sessionStatus || 'Active');

    // Prepare session data for validation
    const sessionData = {
      id: session.id || '',
      title: session.title || '',
      repo,
      branch,
      targetBranch,
      messages: null, // Messages are now separate entities in the new API
      inboxStatus,
      sessionStatus: session.sessionStatus || 'Active',
      parentId: session.parent || null,
      createdAt: session.createdAt || new Date().toISOString(),
      diffStats: session.diffStats,
      prUrl: session.prUrl,
      children: session.children ? this.deserializeSessions(session.children) : undefined,
      sbxConfig: session.sbxConfig || null,
    };

    // Parse and validate the session data (parse don't validate)
    return SessionSchema.parse(sessionData);
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
    const messageData = {
      id: message.id || '',
      role: message.role || 'user',
      content: message.content || '',
      createdAt: message.createdAt || new Date().toISOString(),
    };

    // Parse and validate the message data (parse don't validate)
    return MessageSchema.parse(messageData);
  }

  /**
   * Deserializes an array of messages
   */
  private deserializeMessages(messages: any[]): Message[] {
    if (!Array.isArray(messages)) {
      return [];
    }

    // Parse and validate the entire array (parse don't validate)
    return MessagesArraySchema.parse(
      messages.map((message) => ({
        id: message.id || '',
        role: message.role || 'user',
        content: message.content || '',
        createdAt: message.createdAt || new Date().toISOString(),
      }))
    );
  }
}
