import { Badge } from '@/components/ui/badge';
import { AssistantMessage } from '@/utils/conversationTransform';

interface PromptMessageProps {
  message: AssistantMessage;
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

export function PromptMessage({ message }: PromptMessageProps) {
  const textContent = message.content.find((c) => c.type === 'text');
  const status = message.metadata?.status || 'pending';
  const timestamp = message.metadata?.createdAt;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-indigo-900">Prompt</span>
          {timestamp && (
            <span
              className="text-xs text-gray-500"
              title={timestamp.toLocaleString()}
            >
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
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
