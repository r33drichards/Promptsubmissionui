import { Session } from '../types/session';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ExternalLink, GitBranch, Github, GitMerge } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useState } from 'react';

interface SessionDetailProps {
  session: Session;
  onCreatePR: (sessionId: string) => void;
  onReply: (sessionId: string, message: string) => void;
}

export function SessionDetail({ session, onCreatePR, onReply }: SessionDetailProps) {
  const [reply, setReply] = useState('');

  const handleReply = () => {
    if (reply.trim()) {
      onReply(session.id, reply);
      setReply('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="mb-2">{session.title}</h2>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Github className="w-4 h-4" />
                <span>{session.repo}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <GitBranch className="w-4 h-4" />
                  <span>{session.branch}</span>
                </div>
                <GitMerge className="w-3 h-3" />
                <div className="flex items-center gap-1">
                  <GitBranch className="w-4 h-4" />
                  <span>{session.targetBranch}</span>
                </div>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              session.inboxStatus === 'completed'
                ? 'bg-green-50 text-green-700 border-green-300'
                : session.inboxStatus === 'in-progress'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : session.inboxStatus === 'failed'
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-gray-50 text-gray-700 border-gray-300'
            }
          >
            {session.inboxStatus}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {session.messages && session.messages.length > 0 ? (
          <div className="space-y-4">
            {session.messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.role === 'user' ? 'bg-gray-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{message.role === 'user' ? 'You' : 'Assistant'}</span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            ))}

            {session.inboxStatus === 'completed' && session.diffStats && (
              <div className="bg-white border rounded-lg p-4 space-y-3">
                <h3 className="text-sm">Changes</h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-green-600">
                    +{session.diffStats.additions} additions
                  </span>
                  <span className="text-sm text-red-600">
                    -{session.diffStats.deletions} deletions
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-3">
        {session.prUrl ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(session.prUrl, '_blank')}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View PR
          </Button>
        ) : session.inboxStatus === 'completed' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreatePR(session.id)}
            className="w-full"
          >
            <Github className="w-4 h-4 mr-2" />
            Create PR
          </Button>
        ) : null}

        <div className="flex gap-2">
          <Textarea
            placeholder="Reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleReply();
              }
            }}
          />
          <Button onClick={handleReply} disabled={!reply.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
