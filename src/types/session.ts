
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
