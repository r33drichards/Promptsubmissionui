import React from 'react';

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
  placeholder,
}: MonacoEditorProps) {
  return (
    <textarea
      aria-label="Prompt"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required
    />
  );
}
