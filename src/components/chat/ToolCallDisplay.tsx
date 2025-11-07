import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  args: any;
  result?: any;
}

export function ToolCallDisplay({
  toolName,
  args,
  result,
}: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white/50 rounded border border-gray-200 my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full p-2 text-left hover:bg-gray-50"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="text-xs font-medium text-gray-700">
          Tool: {toolName}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          <div>
            <p className="text-xs text-gray-600 mb-1">Input:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full bg-gray-50 p-2 rounded">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {result !== undefined && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Result:</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full bg-gray-50 p-2 rounded">
                {typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
