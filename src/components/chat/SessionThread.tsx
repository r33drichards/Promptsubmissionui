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

export function SessionThread({ conversation, isLoading }: SessionThreadProps) {
  console.log('[DEBUG SessionThread] Received conversation:', conversation);
  console.log('[DEBUG SessionThread] isLoading:', isLoading);

  const messages = useMemo(() => {
    console.log('[DEBUG SessionThread] Converting conversation to messages');
    const result = convertConversationToMessages(conversation);
    console.log('[DEBUG SessionThread] Converted messages:', result);
    return result;
  }, [conversation]);

  console.log('[DEBUG SessionThread] Final messages to render:', messages);

  if (isLoading) {
    console.log('[DEBUG SessionThread] Showing loading state');
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Loading conversation...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    console.log('[DEBUG SessionThread] Showing empty state - no messages');
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No conversation yet</p>
      </div>
    );
  }

  console.log('[DEBUG SessionThread] Rendering messages');

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {messages.map((message) =>
          message.metadata?.isPrompt ? (
            <PromptMessage key={message.id} message={message} />
          ) : (
            <div key={message.id}>
              <div className="flex items-center mb-2">
                <span className="font-medium capitalize text-sm">
                  {message.role}
                </span>
              </div>
              <MessageContent message={message} />
            </div>
          )
        )}
      </div>
    </ScrollArea>
  );
}
