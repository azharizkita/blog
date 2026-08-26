"use client";

import { useSyncExternalStore } from "react";
import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  // resolvedTheme is undefined during SSR, so theming the first render by it
  // causes a hydration mismatch (server: light, dark-mode client: dark).
  // Render light until hydration completes — the server snapshot (false)
  // keeps the first client render identical to the server, and the real
  // theme applies immediately after.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="overflow-hidden rounded-md border">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={mounted && resolvedTheme === "dark" ? "dark" : "light"}
        extensions={[markdown()]}
        height="70vh"
        basicSetup={{ lineNumbers: false, foldGutter: false }}
      />
    </div>
  );
}
