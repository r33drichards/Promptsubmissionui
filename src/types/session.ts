import { UiStatus } from '@wholelottahoopla/prompt-backend-client';

export type InboxStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'failed'
  | 'needs-review'
  | 'needs-review-ip-returned';

export type SessionStatus = 'Active' | 'Archived' | 'ReturningIp';

export interface Session {
  id: string;
  title: string;
  repo?: string;
  branch?: string;
  target_branch?: string;
  messages: Message[] | null;
  inbox_status: InboxStatus;
  ui_status: UiStatus;
  statusMessage?: string;
  sbx_config: Record<string, any> | null;
  parent: string | null;
  diff_stats?: {
    additions: number;
    deletions: number;
  };
  pr_url?: string;
  created_at: string;
  children?: Session[];
  session_status: SessionStatus;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Prompt {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// BackendMessage is a unique structure for Claude Code output format
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
