export type InboxStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'needs-review'
  | 'needs-review-ip-returned';
export type SessionStatus = 'Active' | 'Archived' | 'ReturningIp';
export type UiStatus =
  | 'Pending'
  | 'InProgress'
  | 'NeedsReview'
  | 'NeedsReviewIpReturned'
  | 'Archived';

export interface Session {
  id: string;
  title: string;
  repo: string;
  branch: string;
  targetBranch: string;
  messages: Message[] | null;
  inboxStatus: InboxStatus;
  uiStatus: UiStatus;
  statusMessage?: string;
  sbxConfig: Record<string, any> | null;
  parentId: string | null;
  diffStats?: {
    additions: number;
    deletions: number;
  };
  prUrl?: string;
  createdAt: Date;
  children?: Session[];
  sessionStatus: SessionStatus;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

// New backend message structure (from Claude Code output)
export interface BackendMessage {
  type: 'assistant' | 'user' | 'system' | 'result';
  uuid: string;
  message: {
    id?: string;
    role?: 'user' | 'assistant';
    type?: 'message';
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
      service_tier?: string;
    };
    content: Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      id?: string;
      name?: string;
      input?: any;
      tool_use_id?: string;
      content?: any;
    }>;
    stop_reason?: string | null;
    stop_sequence?: string | null;
  };
  session_id: string;
  parent_tool_use_id?: string | null;
}

export interface Prompt {
  id: string;
  sessionId: string;
  content: string;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
