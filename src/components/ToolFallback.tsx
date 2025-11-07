import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { theme } = useTheme();

  console.log('[ToolFallback] Rendering tool:', toolName, 'result:', result);

  // Function to detect if content is JSON
  const isJSON = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  // Format and determine language for input
  const inputLanguage = isJSON(argsText) ? 'json' : 'plaintext';
  const formattedInput =
    inputLanguage === 'json'
      ? JSON.stringify(JSON.parse(argsText), null, 2)
      : argsText;

  // Format and determine language for result
  const resultText =
    typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const resultLanguage = isJSON(resultText) ? 'json' : 'plaintext';
  const formattedResult =
    resultLanguage === 'json'
      ? JSON.stringify(JSON.parse(resultText), null, 2)
      : resultText;

  return (
    <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="flex items-center gap-2 px-4">
        <CheckIcon className="size-4" />
        <p className="flex-grow">
          Used tool: <b>{toolName}</b>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col gap-2 border-t pt-2">
          <div className="px-4">
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="200px"
                language={inputLanguage}
                value={formattedInput}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'off',
                  folding: false,
                  renderLineHighlight: 'none',
                }}
              />
            </div>
          </div>
          {result !== undefined && (
            <div className="border-t border-dashed px-4 pt-2">
              <p className="font-semibold text-sm mb-2">Result:</p>
              <div className="border rounded-md overflow-hidden">
                <Editor
                  height="200px"
                  language={resultLanguage}
                  value={formattedResult}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'off',
                    folding: false,
                    renderLineHighlight: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
