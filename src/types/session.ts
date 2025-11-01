export type InboxStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface Session {
  id: string;
  title: string;
  repo: string;
  branch: string;
  targetBranch: string;
  messages: Message[] | null;
  inboxStatus: InboxStatus;
  sbxConfig: Record<string, any> | null;
  parentId: string | null;
  diffStats?: {
    additions: number;
    deletions: number;
  };
  prUrl?: string;
  createdAt: Date;
  children?: Session[];
  archived?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
