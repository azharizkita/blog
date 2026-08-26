"use client";

import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="overflow-hidden rounded-md border">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        extensions={[markdown()]}
        height="70vh"
        basicSetup={{ lineNumbers: false, foldGutter: false }}
      />
    </div>
  );
}
