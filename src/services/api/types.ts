import {
  Session,
  Message,
  InboxStatus,
  SessionStatus,
  BackendMessage,
  Prompt,
} from "../../types/session";

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
  };

  // Message operations
  messages: {
    list(sessionId: string): Promise<BackendMessage[]>;
    create(sessionId: string, content: string): Promise<Message>;
  };
}

// Request/Response types

export interface ListSessionsParams {
  status?: InboxStatus;
  archived?: boolean;
  parentId?: string | null;
  limit?: number;
  offset?: number;
}

export interface CreateSessionData {
  repo: string;
  targetBranch: string;
  messages?: any; // Optional messages field
  parentId?: string | null;
}

export interface UpdateSessionData {
  title?: string;
  inboxStatus?: InboxStatus;
  prUrl?: string;
  diffStats?: {
    additions: number;
    deletions: number;
  };
  sessionStatus?: SessionStatus;
  repo?: string;
  branch?: string;
  targetBranch?: string;
}
