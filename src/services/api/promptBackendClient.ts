import {
  DefaultApi,
  Configuration,
  SessionStatus as SDKSessionStatus,
  CreateSessionWithPromptInput as _CreateSessionWithPromptInput,
  CreateSessionWithPromptOutput as _CreateSessionWithPromptOutput,
} from '@wholelottahoopla/prompt-backend-client';
import {
  Session,
  Message,
  SessionStatus as _SessionStatus,
  BackendMessage,
  Prompt,
} from '../../types/session';
import {
  BackendClient,
  CreateSessionData,
  UpdateSessionData,
  ListSessionsParams,
} from './types';
import {
  SessionSchema,
  SessionsArraySchema as _SessionsArraySchema,
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
      basePath:
        basePath ||
        import.meta.env.VITE_BACKEND_URL ||
        'https://prompt-backend-production.up.railway.app',
      credentials: 'include', // Required for Service Worker to inject Bearer tokens
    });
    this.api = new DefaultApi(config);
  }

  sessions = {
    list: async (_params?: ListSessionsParams): Promise<Session[]> => {
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

      // Parse input data using Zod
      const validatedData = CreateSessionDataSchema.parse(data);
      console.log(
        '[PromptBackendClient] Creating session with prompt using new endpoint'
      );
      // Use Raw API to access response before SDK transformation
      // The SDK incorrectly transforms snake_case to camelCase, but the backend
      // actually returns camelCase already
      const rawResponse = await this.api.handlersSessionsCreateWithPromptRaw({
        createSessionWithPromptInput: {
          repo: validatedData.repo,
          targetBranch: validatedData.targetBranch,
          messages: validatedData.messages,
          parentId: validatedData.parentId || null,
        },
      });

      // Get the raw JSON before SDK transformation
      const rawJson = await rawResponse.raw.json();
      console.log('[PromptBackendClient] CreateWithPrompt raw JSON:', rawJson);

      // Extract IDs from raw JSON (backend sends camelCase)
      const sessionId = rawJson.sessionId || rawJson.session_id || null;
      const _promptId = rawJson.promptId || rawJson.prompt_id || null;

      console.log('[PromptBackendClient] Extracted IDs:', {
        sessionId,
        promptId: _promptId,
      });

      if (!sessionId) {
        console.error(
          '[PromptBackendClient] Invalid response structure:',
          rawJson
        );
        console.error(
          '[PromptBackendClient] Available keys:',
          Object.keys(rawJson || {})
        );
        throw new Error(
          'Failed to create session with prompt: Invalid response from backend'
        );
      }

      // Fetch the full session data
      return this.sessions.get(sessionId);
    },

    update: async (id: string, data: UpdateSessionData): Promise<Session> => {
      console.log(
        '[PromptBackendClient] Updating session:',
        id,
        'with data:',
        data
      );

      // Build update input with only the fields that are provided or need to be updated
      const updateInput: any = {
        id,
      };

      // Only include fields that are explicitly provided in the update data
      if (data.title !== undefined) updateInput.title = data.title;
      if (data.sessionStatus !== undefined)
        updateInput.sessionStatus = data.sessionStatus as SDKSessionStatus;
      if (data.repo !== undefined) updateInput.repo = data.repo;
      if (data.branch !== undefined) updateInput.branch = data.branch;
      if (data.targetBranch !== undefined)
        updateInput.targetBranch = data.targetBranch;

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
        const result = await this.sessions.update(id, {
          sessionStatus: 'Archived',
        });
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

  prompts = {
    list: async (sessionId: string): Promise<Prompt[]> => {
      try {
        const response = await this.api.handlersPromptsList({ sessionId });
        return this.deserializePrompts(response.prompts || []);
      } catch (error) {
        console.error('[PromptBackendClient] Failed to list prompts:', error);
        return [];
      }
    },
  };

  messages = {
    list: async (promptId: string): Promise<BackendMessage[]> => {
      try {
        // Fetch all messages for the prompt
        const response = await this.api.handlersMessagesList({ promptId });
        return this.deserializeBackendMessages(response.messages || []);
      } catch (error) {
        console.error('[PromptBackendClient] Failed to list messages:', error);
        return [];
      }
    },

    create: async (_sessionId: string, _content: string): Promise<Message> => {
      // TODO: The new API structure requires creating a Prompt first, then adding Messages to it.
      // This needs to be redesigned based on the app's requirements.
      console.error(
        '[PromptBackendClient] messages.create is not yet implemented for the new API structure'
      );
      throw new Error(
        'messages.create is not yet implemented for the new API structure. Please use the Prompts API.'
      );
    },
  };

  /**
   * Maps SessionStatus to our local InboxStatus format
   * Note: The new API uses SessionStatus instead of InboxStatus
   */
  private sessionStatusToInboxStatus(
    sessionStatus: string
  ): 'pending' | 'in-progress' | 'completed' | 'failed' {
    const statusMap: Record<
      string,
      'pending' | 'in-progress' | 'completed' | 'failed'
    > = {
      Active: 'in-progress',
      Archived: 'completed',
      Completed: 'completed',
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
    const targetBranch =
      session.targetBranch || sbxConfig.targetBranch || 'main';

    // Map sessionStatus to inboxStatus for backwards compatibility
    const inboxStatus = this.sessionStatusToInboxStatus(
      session.sessionStatus || 'Active'
    );

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
      children: session.children
        ? this.deserializeSessions(session.children)
        : undefined,
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

  /**
   * Deserializes an array of backend messages (Claude Code output format)
   */
  private deserializeBackendMessages(messages: any[]): BackendMessage[] {
    if (!Array.isArray(messages)) {
      return [];
    }

    return messages.map((msg) => {
      // The actual API response wraps the data under a "data" field
      const data = msg.data || msg;

      return {
        type: data.type || 'user',
        uuid: data.uuid || msg.id || '',
        message: data.message || {},
        session_id: data.session_id || data.sessionId || '',
        parent_tool_use_id: data.parent_tool_use_id || null,
      };
    });
  }

  /**
   * Deserializes a single prompt
   */
  private deserializePrompt(prompt: any): Prompt {
    // The actual API response has content in data[0].content and status in inbox_status
    const content =
      prompt.data && Array.isArray(prompt.data) && prompt.data[0]?.content
        ? prompt.data[0].content
        : prompt.content || '';

    const status = prompt.inbox_status || prompt.status || 'pending';

    return {
      id: prompt.id || '',
      sessionId: prompt.sessionId || prompt.session_id || '',
      content,
      createdAt: prompt.createdAt
        ? new Date(prompt.createdAt)
        : prompt.created_at
          ? new Date(prompt.created_at)
          : new Date(),
      status,
    };
  }

  /**
   * Deserializes an array of prompts
   */
  private deserializePrompts(prompts: any[]): Prompt[] {
    if (!Array.isArray(prompts)) {
      return [];
    }

    return prompts.map((prompt) => this.deserializePrompt(prompt));
  }
}
