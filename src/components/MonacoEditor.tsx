import { useRef, useEffect } from 'react';
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

  // Use a ref to store the latest onSubmit callback to avoid stale closures
  const onSubmitRef = useRef(onSubmit);

  // Update the ref whenever onSubmit changes
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Register Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) keyboard shortcut
    // Use the ref so we always call the latest onSubmit callback
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      console.log('[MonacoEditor] Cmd+Enter pressed, calling onSubmit');
      if (onSubmitRef.current) {
        onSubmitRef.current();
      }
    });
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={'350px'}
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
