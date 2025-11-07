import { Session } from '../types/session';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ExternalLink, GitBranch, Github, GitMerge } from 'lucide-react';
import { useSessionConversation } from '../hooks/useMessages';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import { useAssistantRuntime } from '../hooks/useAssistantRuntime';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import { ToolFallback } from './ToolFallback';
import '@assistant-ui/react-ui/styles/index.css';

interface SessionDetailProps {
  session: Session;
  onCreatePR: (sessionId: string) => void;
}

export function SessionDetail({ session, onCreatePR }: SessionDetailProps) {
  const { conversation, isLoading } = useSessionConversation(session.id);
  const runtime = useAssistantRuntime(
    session.id,
    conversation || [],
    isLoading
  );

  return (
    <div className="flex flex-col h-full">
      {/* Session Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="mb-2">{session.title}</h2>
            {session.statusMessage && (
              <p className="text-sm text-gray-600 mb-2 italic">
                {session.statusMessage}
              </p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Github className="w-4 h-4 flex-shrink-0" />
                <a
                  href={`https://github.com/${session.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline truncate"
                >
                  {session.repo}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-shrink">
                  <GitBranch className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`https://github.com/${session.repo}/tree/${session.branch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline truncate"
                  >
                    {session.branch}
                  </a>
                </div>
                <GitMerge className="w-3 h-3 flex-shrink-0" />
                <div className="flex items-center gap-1 min-w-0 flex-shrink">
                  <GitBranch className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`https://github.com/${session.repo}/tree/${session.targetBranch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline truncate"
                  >
                    {session.targetBranch}
                  </a>
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

      {/* Chat Container */}
      <div className="flex-1 min-h-0 overflow-auto">
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread
            assistantMessage={{
              components: {
                Text: MarkdownTextPrimitive,
                ToolFallback: ToolFallback,
              },
            }}
          />
        </AssistantRuntimeProvider>

        {session.inboxStatus === 'completed' && session.diffStats && (
          <div className="p-4 border-t">
            <div className="bg-white border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium">Changes</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-green-600">
                  +{session.diffStats.additions} additions
                </span>
                <span className="text-sm text-red-600">
                  -{session.diffStats.deletions} deletions
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t p-4">
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
      </div>
    </div>
  );
}
