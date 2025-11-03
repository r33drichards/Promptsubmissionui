import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  height?: string;
  language?: string;
}

export function MonacoEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  height = '300px',
  language = 'markdown',
}: MonacoEditorProps) {
  const { theme } = useTheme();

  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        onChange={handleEditorChange}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          wrappingIndent: 'same',
          padding: { top: 10, bottom: 10 },
          suggest: {
            showKeywords: false,
            showSnippets: false,
          },
          quickSuggestions: false,
        }}
      />
    </div>
  );
}
