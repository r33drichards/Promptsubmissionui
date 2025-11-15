import {
  Session,
  Message,
  InboxStatus,
  SessionStatus,
  BackendMessage,
  Prompt,
} from '../../types/session';
import { UiStatus } from '@wholelottahoopla/prompt-backend-client';

/**
 * Backend API client interface.
 * This defines all the operations that can be performed against the backend.
 */
export interface BackendClient {
  // Session operations
  sessions: {
    list(params?: ListSessionsParams): Promise<Session[]>;
    get(id: string): Promise<Session>;
    create(data: CreateSessionData): Promise<Session>;
    update(id: string, data: UpdateSessionData): Promise<Session>;
    delete(id: string): Promise<void>;
    archive(id: string): Promise<Session>;
    unarchive(id: string): Promise<Session>;
  };

  // Prompt operations
  prompts: {
    list(sessionId: string): Promise<Prompt[]>;
    create(sessionId: string, content: string): Promise<Prompt>;
  };

  // Message operations
  messages: {
    list(promptId: string): Promise<BackendMessage[]>;
    create(sessionId: string, content: string): Promise<Message>;
  };
}

// Request/Response types

export interface ListSessionsParams {
  status?: InboxStatus;
  archived?: boolean;
  parent?: string | null;
  limit?: number;
  offset?: number;
}

export interface CreateSessionData {
  repo: string;
  target_branch: string;
  messages?: any; // Optional messages field
  parent?: string | null;
}

export interface UpdateSessionData {
  title?: string;
  inbox_status?: InboxStatus;
  ui_status?: UiStatus;
  pr_url?: string;
  diff_stats?: {
    additions: number;
    deletions: number;
  };
  session_status?: SessionStatus;
  repo?: string;
  branch?: string;
  target_branch?: string;
}
