import { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useState } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
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

  // Special handling for different MCP tools
  let inputLanguage = 'plaintext';
  let formattedInput = argsText;
  let resultLanguage = 'plaintext';
  let formattedResult = '';
  let useDiffEditor = false;
  let diffOriginal = '';
  let diffModified = '';
  let diffLanguage = 'plaintext';
  let resultDiffOriginal = '';
  let resultDiffModified = '';
  let resultDiffLanguage = 'plaintext';
  let filePath = '';

  if (toolName === 'mcp__sandbox__str_replace_editor') {
    try {
      // Parse the input to extract diff information
      const inputData = JSON.parse(argsText);
      useDiffEditor = true;

      if (
        inputData.command === 'str_replace' &&
        inputData.old_str &&
        inputData.new_str
      ) {
        diffOriginal = inputData.old_str;
        diffModified = inputData.new_str;
        filePath = inputData.path || '';

        // Infer language from file extension
        if (filePath) {
          const ext = filePath.split('.').pop()?.toLowerCase();
          const langMap: Record<string, string> = {
            ts: 'typescript',
            tsx: 'typescript',
            js: 'javascript',
            jsx: 'javascript',
            py: 'python',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            go: 'go',
            rs: 'rust',
            rb: 'ruby',
            php: 'php',
            html: 'html',
            css: 'css',
            scss: 'scss',
            json: 'json',
            xml: 'xml',
            yaml: 'yaml',
            yml: 'yaml',
            md: 'markdown',
            sh: 'shell',
            sql: 'sql',
          };
          diffLanguage = langMap[ext || ''] || 'plaintext';
        }
      }

      // Parse the result to extract diff information
      if (result) {
        const resultData =
          typeof result === 'string' ? JSON.parse(result) : result;
        // Use old_content and new_content if available, fall back to output
        if (
          resultData.old_content &&
          (resultData.new_content || resultData.output)
        ) {
          resultDiffOriginal = resultData.old_content;
          resultDiffModified = resultData.new_content || resultData.output;
          resultDiffLanguage = diffLanguage; // Use same language as input
        } else {
          // Fallback: show result as regular editor
          const resultText =
            typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2);
          formattedResult = resultText;
        }
      }
    } catch {
      // Fallback to default JSON formatting if parsing fails
      useDiffEditor = false;
      inputLanguage = 'json';
      formattedInput = JSON.stringify(JSON.parse(argsText), null, 2);
      const resultText =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      resultLanguage = 'json';
      formattedResult = JSON.stringify(JSON.parse(resultText), null, 2);
    }
  } else if (toolName === 'mcp__sandbox__execute_code') {
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
            {filePath && (
              <p className="text-sm text-muted-foreground mb-2">
                <b>File:</b> {filePath}
              </p>
            )}
            <div className="border rounded-md overflow-hidden">
              {useDiffEditor ? (
                <DiffEditor
                  height="300px"
                  language={diffLanguage}
                  original={diffOriginal}
                  modified={diffModified}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    renderSideBySide: true,
                    renderLineHighlight: 'none',
                    enableSplitViewResizing: false,
                  }}
                />
              ) : (
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
              )}
            </div>
          </div>
          {result !== undefined && (
            <div className="border-t border-dashed px-4 pt-2">
              <p className="font-semibold text-sm mb-2">Result:</p>
              <div className="border rounded-md overflow-hidden">
                {useDiffEditor && resultDiffOriginal && resultDiffModified ? (
                  <DiffEditor
                    height="300px"
                    language={resultDiffLanguage}
                    original={resultDiffOriginal}
                    modified={resultDiffModified}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      renderSideBySide: true,
                      renderLineHighlight: 'none',
                      enableSplitViewResizing: false,
                    }}
                  />
                ) : (
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
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
