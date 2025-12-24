import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationItem } from '@/hooks/useMessages';
import { convertConversationToMessages } from '@/utils/conversationTransform';
import { PromptMessage } from './PromptMessage';
import { MessageContent } from './MessageContent';

interface SessionThreadProps {
  conversation: ConversationItem[];
  isLoading: boolean;
}

function formatTimestamp(date: Date | undefined): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function SessionThread({ conversation, isLoading }: SessionThreadProps) {
  const messages = useMemo(
    () => convertConversationToMessages(conversation),
    [conversation]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No conversation yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {messages.map((message) =>
          message.metadata?.isPrompt ? (
            <PromptMessage key={message.id} message={message} />
          ) : (
            <div key={message.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium capitalize text-sm">
                  {message.role}
                </span>
                {message.metadata?.createdAt && (
                  <span
                    className="text-xs text-gray-500"
                    title={message.metadata.createdAt.toLocaleString()}
                  >
                    {formatTimestamp(message.metadata.createdAt)}
                  </span>
                )}
              </div>
              <MessageContent message={message} />
            </div>
          )
        )}
      </div>
    </ScrollArea>
  );
}
