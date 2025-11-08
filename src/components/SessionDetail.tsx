import { Session } from '../types/session';
import { Badge } from './ui/badge';
import {
  GitBranch,
  GitMerge,
  Github,
  Check,
  X,
  GitPullRequest,
} from 'lucide-react';
import { useSessionConversation } from '../hooks/useMessages';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Thread } from '@assistant-ui/react-ui';
import { useAssistantRuntime } from '../hooks/useAssistantRuntime';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import { ToolFallback } from './ToolFallback';
import { truncateBranchName } from '@/utils/stringUtils';
import { useUpdateSession } from '../hooks/useSessionMutations';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useState, useRef, useEffect } from 'react';
import '@assistant-ui/react-ui/styles/index.css';

interface SessionDetailProps {
  session: Session;
}

// Helper function to generate GitHub PR creation URL with query parameters
function generatePRUrl(session: Session): string {
  const { repo, targetBranch, branch, title } = session;

  // Base URL for PR comparison
  const baseUrl = `https://github.com/${repo}/compare/${targetBranch}...${branch}`;

  // Build query parameters
  const params = new URLSearchParams({
    quick_pull: '1',
    title: title || 'Update from Claude',
  });

  // Add body with session information
  const body = `This pull request was created from a Claude Code session.\n\nSession ID: ${session.id}`;
  params.append('body', body);

  return `${baseUrl}?${params.toString()}`;
}

export function SessionDetail({ session }: SessionDetailProps) {
  const { conversation, isLoading } = useSessionConversation(session.id);
  const runtime = useAssistantRuntime(
    session.id,
    conversation || [],
    isLoading
  );

  const prCreationUrl = generatePRUrl(session);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateSession = useUpdateSession();

  // Reset title value when session changes
  useEffect(() => {
    setTitleValue(session.title);
  }, [session.title]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = () => {
    const trimmedTitle = titleValue.trim();
    if (trimmedTitle && trimmedTitle !== session.title) {
      updateSession.mutate({
        id: session.id,
        data: { title: trimmedTitle },
      });
    } else {
      // Reset to original title if empty or unchanged
      setTitleValue(session.title);
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setTitleValue(session.title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Session Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    ref={inputRef}
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveTitle}
                    className="text-xl font-semibold h-auto py-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={handleSaveTitle}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <h2
                  className="flex-1 cursor-pointer hover:text-gray-600 transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {session.title}
                </h2>
              )}
            </div>
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
                    className="hover:text-blue-600 hover:underline"
                    title={session.branch}
                  >
                    {truncateBranchName(session.branch)}
                  </a>
                </div>
                <GitMerge className="w-3 h-3 flex-shrink-0" />
                <div className="flex items-center gap-1 min-w-0 flex-shrink">
                  <GitBranch className="w-4 h-4 flex-shrink-0" />
                  <a
                    href={`https://github.com/${session.repo}/tree/${session.targetBranch}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline"
                    title={session.targetBranch}
                  >
                    {truncateBranchName(session.targetBranch)}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className='bg-gray-50 text-gray-700 border-gray-300'
          >
            {session.uiStatus}
          </Badge>
            {/* Pull Request Creation Button */}
            {session.prUrl ? (
              <a
                href={session.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <GitPullRequest className="w-4 h-4" />
                  View Pull Request
                </Button>
              </a>
            ) : (
              <a
                href={prCreationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <GitPullRequest className="w-4 h-4" />
                  Create Pull Request
                </Button>
              </a>
            )}
          </div>
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
    </div>
  );
}
