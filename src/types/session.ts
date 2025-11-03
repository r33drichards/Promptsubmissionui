export type InboxStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
export type SessionStatus = 'Active' | 'Archived';

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
  sessionStatus: SessionStatus;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
