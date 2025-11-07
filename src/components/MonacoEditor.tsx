import Editor, { OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  onSubmit?: () => void;
  placeholder?: string;
  height?: string;
  language?: string;
}

export function MonacoEditor({
  value,
  onChange,
  onSubmit,
  placeholder: _placeholder = 'Start typing...',
  language = 'markdown',
}: MonacoEditorProps) {
  const { theme } = useTheme();

  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Register Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) keyboard shortcut
    if (onSubmit) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        console.log('[MonacoEditor] Cmd+Enter pressed, calling onSubmit');
        onSubmit();
      });
    }
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={'600px'}
        defaultLanguage={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{}}
      />
    </div>
  );
}
