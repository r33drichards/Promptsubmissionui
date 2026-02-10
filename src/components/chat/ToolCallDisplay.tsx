import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

interface ToolCallDisplayProps {
  toolName: string;
  args: any;
  result?: any;
}

function isErrorResult(result: any): boolean {
  if (!result) return false;
  
  // Check if result is an object with error indicators
  if (typeof result === 'object') {
    return (
      result.error !== undefined ||
      result.is_error === true ||
      result.status === 'error' ||
      result.success === false
    );
  }
  
  // Check if result string contains error indicators
  if (typeof result === 'string') {
    const lowerResult = result.toLowerCase();
    return (
      lowerResult.includes('error:') ||
      lowerResult.includes('exception:') ||
      lowerResult.includes('failed:') ||
      lowerResult.includes('traceback')
    );
  }
  
  return false;
}

export function ToolCallDisplay({
  toolName,
  args,
  result,
}: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded to show errors
  const hasError = isErrorResult(result);
  const hasResult = result !== undefined;

  return (
    <div className={`rounded border my-2 ${
      hasError 
        ? 'bg-red-50/50 border-red-200' 
        : hasResult 
          ? 'bg-green-50/50 border-green-200'
          : 'bg-white/50 border-gray-200'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 w-full p-2 text-left hover:bg-opacity-70 ${
          hasError 
            ? 'hover:bg-red-100' 
            : hasResult 
              ? 'hover:bg-green-100'
              : 'hover:bg-gray-50'
        }`}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
        
        {hasError ? (
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
        ) : hasResult ? (
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : null}
        
        <span className="text-xs font-medium text-gray-700 flex-grow">
          Tool: {toolName}
        </span>
        
        {hasResult && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            hasError 
              ? 'bg-red-200 text-red-800' 
              : 'bg-green-200 text-green-800'
          }`}>
            {hasError ? 'Error' : 'Success'}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          <div>
            <p className="text-xs text-gray-600 mb-1 font-semibold">Input:</p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full bg-white/60 p-2 rounded border border-gray-200">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>

          {result !== undefined && (
            <div>
              <p className={`text-xs mb-1 font-semibold ${
                hasError ? 'text-red-700' : 'text-green-700'
              }`}>
                {hasError ? 'Error Output:' : 'Output:'}
              </p>
              <pre className={`text-xs overflow-x-auto whitespace-pre-wrap break-words max-w-full p-2 rounded border ${
                hasError 
                  ? 'bg-red-50 border-red-300 text-red-900' 
                  : 'bg-white/60 border-gray-200'
              }`}>
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
