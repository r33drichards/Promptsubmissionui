import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
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

  // Special handling for mcp__sandbox__execute_code
  let inputLanguage = 'plaintext';
  let formattedInput = argsText;
  let resultLanguage = 'plaintext';
  let formattedResult = '';

  if (toolName === 'mcp__sandbox__execute_code') {
    try {
      // Parse the input to extract code and language
      const inputData = JSON.parse(argsText);
      if (inputData.code && inputData.language) {
        inputLanguage = inputData.language;
        formattedInput = inputData.code;
      }

      // Parse the result to extract the actual output
      const resultData =
        typeof result === 'string' ? JSON.parse(result) : result;
      if (resultData) {
        // Combine stdout and stderr if available
        const output = [];
        if (resultData.stdout) output.push(resultData.stdout);
        if (resultData.stderr) output.push(resultData.stderr);
        formattedResult = output.join('\n') || 'No output';
      }
    } catch {
      // Fallback to default JSON formatting if parsing fails
      inputLanguage = 'json';
      formattedInput = JSON.stringify(JSON.parse(argsText), null, 2);
      const resultText =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      resultLanguage = 'json';
      formattedResult = JSON.stringify(JSON.parse(resultText), null, 2);
    }
  } else {
    // Default formatting for other tools
    inputLanguage = isJSON(argsText) ? 'json' : 'plaintext';
    formattedInput =
      inputLanguage === 'json'
        ? JSON.stringify(JSON.parse(argsText), null, 2)
        : argsText;

    const resultText =
      typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    resultLanguage = isJSON(resultText) ? 'json' : 'plaintext';
    formattedResult =
      resultLanguage === 'json'
        ? JSON.stringify(JSON.parse(resultText), null, 2)
        : resultText;
  }

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
            {result !== undefined ? (
              <div className="border rounded-md overflow-hidden">
                <div className="flex justify-between items-center bg-muted px-3 py-1 text-xs border-b">
                  <span>Input</span>
                  <span>Result</span>
                </div>
                <DiffEditor
                  height="400px"
                  language={inputLanguage}
                  original={formattedInput}
                  modified={formattedResult}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: false,
                    renderLineHighlight: 'none',
                    renderSideBySide: true,
                    enableSplitViewResizing: true,
                  }}
                />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <DiffEditor
                  height="200px"
                  language={inputLanguage}
                  original=""
                  modified={formattedInput}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: false,
                    renderLineHighlight: 'none',
                    renderSideBySide: false,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
