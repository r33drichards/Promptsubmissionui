import { Session, Message, InboxStatus, SessionStatus } from '../../types/session';

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

  // Message operations
  messages: {
    list(sessionId: string): Promise<Message[]>;
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
  title: string;
  repo: string;
  branch: string;
  targetBranch: string;
  parentId?: string | null;
  sbxConfig?: Record<string, any>;
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
