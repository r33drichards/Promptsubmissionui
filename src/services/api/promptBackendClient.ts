import {
  DefaultApi,
  Configuration,
  SessionStatus as SDKSessionStatus,
  UiStatus,
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
import { withErrorHandler } from '../../utils/apiErrorHandler';

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
    list: withErrorHandler(
      async (_params?: ListSessionsParams): Promise<Session[]> => {
        const response = await this.api.handlersSessionsList();
        // The response should contain an array of sessions
        // We need to transform the response to match our Session type
        return this.deserializeSessions(response.sessions || []);
      },
      'Loading sessions'
    ),

    get: withErrorHandler(async (id: string): Promise<Session> => {
      const response = await this.api.handlersSessionsRead({ id });
      return this.deserializeSession(response.session);
    }, 'Loading session'),

    create: withErrorHandler(
      async (data: CreateSessionData): Promise<Session> => {
        console.log('[PromptBackendClient] Creating session with data:', data);

        console.log(
          '[PromptBackendClient] Creating session with prompt using new endpoint'
        );
        // Use Raw API to access response before SDK transformation
        const rawResponse = await this.api.handlersSessionsCreateWithPromptRaw({
          createSessionWithPromptInput: {
            repo: data.repo,
            target_branch: data.target_branch,
            messages: data.messages,
            parent: data.parent || null,
          },
        });

        // Get the raw JSON before SDK transformation
        const rawJson = await rawResponse.raw.json();
        console.log(
          '[PromptBackendClient] CreateWithPrompt raw JSON:',
          rawJson
        );

        // Extract IDs from raw JSON
        const sessionId = rawJson.session_id || null;
        const _promptId = rawJson.prompt_id || null;

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
      'Creating session'
    ),

    update: withErrorHandler(
      async (id: string, data: UpdateSessionData): Promise<Session> => {
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
        if (data.session_status !== undefined)
          updateInput.session_status = data.session_status as SDKSessionStatus;
        if (data.ui_status !== undefined)
          updateInput.ui_status = data.ui_status as UiStatus;
        if (data.repo !== undefined) updateInput.repo = data.repo;
        if (data.branch !== undefined) updateInput.branch = data.branch;
        if (data.target_branch !== undefined)
          updateInput.target_branch = data.target_branch;

        console.log('[PromptBackendClient] Update input:', updateInput);

        const response = await this.api.handlersSessionsUpdate({
          id,
          updateSessionInput: updateInput,
        });
        console.log('[PromptBackendClient] Update response:', response);

        // Fetch the updated session data
        return this.sessions.get(id);
      },
      'Updating session'
    ),

    delete: withErrorHandler(async (id: string): Promise<void> => {
      await this.api.handlersSessionsDelete({ id });
    }, 'Deleting session'),

    archive: withErrorHandler(async (id: string): Promise<Session> => {
      console.log('[PromptBackendClient] Archiving session:', id);
      const result = await this.sessions.update(id, {
        session_status: 'Archived',
        ui_status: 'Archived',
      });
      console.log('[PromptBackendClient] Archive successful:', result);
      return result;
    }, 'Archiving session'),

    unarchive: withErrorHandler(async (id: string): Promise<Session> => {
      return this.sessions.update(id, { session_status: 'Active' });
    }, 'Unarchiving session'),
  };

  prompts = {
    list: async (session_id: string): Promise<Prompt[]> => {
      try {
        const response = await this.api.handlersPromptsList({
          sessionId: session_id,
        });
        return this.deserializePrompts(response.prompts || []);
      } catch (error) {
        console.error('[PromptBackendClient] Failed to list prompts:', error);
        return [];
      }
    },

    create: withErrorHandler(
      async (session_id: string, content: string): Promise<Prompt> => {
        const response = await this.api.handlersPromptsCreate({
          createPromptInput: {
            sessionId: session_id,
            data: [{ content, type: 'text' }],
          },
        });

        if (!response.prompt) {
          throw new Error(
            'Failed to create prompt: Invalid response from backend'
          );
        }

        return this.deserializePrompt(response.prompt);
      },
      'Creating prompt'
    ),
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

    // Extract repo, branch, and target_branch from sbx_config if they exist there
    const sbx_config = session.sbx_config || {};
    const repo = session.repo || sbx_config.repo || '';
    const branch = session.branch || sbx_config.branch || '';
    const target_branch =
      session.target_branch || sbx_config.target_branch || 'main';

    // Map session_status to inbox_status for backwards compatibility
    const inbox_status = this.sessionStatusToInboxStatus(
      session.session_status || 'Active'
    );

    // Extract ui_status from API
    const ui_status = (session.ui_status || 'Pending') as UiStatus;

    // Return session data
    return {
      id: session.id || '',
      title: session.title || '',
      repo,
      branch,
      target_branch,
      messages: null, // Messages are now separate entities in the new API
      inbox_status,
      ui_status,
      session_status: session.session_status || 'Active',
      parent: session.parent || null,
      created_at: new Date(session.created_at || new Date().toISOString()),
      diff_stats: session.diff_stats,
      pr_url: session.pr_url,
      children: session.children
        ? this.deserializeSessions(session.children)
        : undefined,
      sbx_config: session.sbx_config || null,
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
      created_at: new Date(message.created_at || new Date().toISOString()),
    };
  }

  /**
   * Deserializes an array of messages
   */
  private deserializeMessages(messages: any[]): Message[] {
    if (!Array.isArray(messages)) {
      return [];
    }

    return messages.map((message) => ({
      id: message.id || '',
      role: message.role || 'user',
      content: message.content || '',
      created_at: new Date(message.created_at || new Date().toISOString()),
    }));
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
        session_id: data.session_id || '',
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
      session_id: prompt.session_id || '',
      content,
      created_at: prompt.created_at ? new Date(prompt.created_at) : new Date(),
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
