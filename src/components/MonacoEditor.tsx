import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

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
  placeholder = "Start typing...",
  language = "markdown",
}: MonacoEditorProps) {
  const { theme } = useTheme();

  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <Editor
        height={"600px"}
        defaultLanguage={language}
        value={value}
        onChange={handleEditorChange}
        theme={theme === "dark" ? "vs-dark" : "light"}
        options={{}}
      />
    </div>
  );
}
