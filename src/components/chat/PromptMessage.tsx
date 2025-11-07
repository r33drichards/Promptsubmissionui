import { Badge } from '@/components/ui/badge';
import { AssistantMessage } from '@/utils/conversationTransform';

interface PromptMessageProps {
  message: AssistantMessage;
}

export function PromptMessage({ message }: PromptMessageProps) {
  const textContent = message.content.find((c) => c.type === 'text');
  const status = message.metadata?.status || 'pending';

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-indigo-900">Prompt</span>
        <Badge
          variant="outline"
          className={
            status === 'completed'
              ? 'bg-green-50 text-green-700 border-green-300'
              : status === 'processing'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : status === 'failed'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-gray-50 text-gray-700 border-gray-300'
          }
        >
          {status}
        </Badge>
      </div>
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg border-l-4 border-indigo-500">
        <p className="text-sm whitespace-pre-wrap text-gray-800 break-words">
          {textContent?.text || ''}
        </p>
      </div>
    </div>
  );
}
