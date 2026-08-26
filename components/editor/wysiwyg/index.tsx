"use client";

import { useEffect, useRef } from "react";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import { useTheme } from "next-themes";
import type { MarkdownStorage } from "tiptap-markdown";
import { createExtensions } from "./extensions";
import { roundTrips } from "./round-trip";
import { Toolbar, promptForLink } from "./toolbar";

// tiptap-markdown exports the `MarkdownStorage` shape but doesn't itself
// augment @tiptap/core's (intentionally empty, per-extension-augmented)
// `Storage` interface, so `editor.storage.markdown` is untyped without this.
declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

const CHANGE_DEBOUNCE_MS = 300;

export interface WysiwygEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  onRoundTripFail: (serialized: string) => void;
}

// StarterKit's bundled Link extension doesn't register a ⌘K shortcut, so a
// tiny extension adds one that reuses the same prompt as the toolbar button.
const LinkShortcut = Extension.create({
  name: "linkShortcut",
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        promptForLink(this.editor);
        return true;
      },
    };
  },
});

export function WysiwygEditor({
  value,
  onChange,
  onRoundTripFail,
}: WysiwygEditorProps) {
  const { resolvedTheme } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      // tiptap-extension-code-block-shiki is configured with both light/dark
      // themes (see extensions.ts) and switches between them purely via the
      // CSS rule appended to globals.css, keyed off the site's .dark class —
      // so the editor never needs to be re-created when the site theme
      // flips (unlike a single-theme setup, which would need to
      // re-highlight every code block). `theme` here only seeds shiki's
      // `defaultTheme` fallback for the brief moment before the highlighter
      // finishes loading; it's read once at mount (see the `[]` deps below).
      extensions: [
        ...createExtensions(resolvedTheme === "dark" ? "dark" : "light"),
        LinkShortcut,
      ],
      content: value,
      // SSR safety: render nothing on the server; mount client-side only.
      immediatelyRender: false,
      onCreate({ editor }) {
        const serialized = editor.storage.markdown.getMarkdown();
        if (!roundTrips(value, serialized)) {
          onRoundTripFail(serialized);
        }
      },
      onUpdate({ editor }) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onChange(editor.storage.markdown.getMarkdown());
        }, CHANGE_DEBOUNCE_MS);
      },
    },
    // Created once on mount (not keyed on `value` or `resolvedTheme`): the
    // parent only ever changes `value` in response to this component's own
    // debounced onChange (see editor-screen.tsx), and the theme is handled
    // by CSS rather than a recreate. `content: value` therefore only matters
    // for the initial parse.
    [],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="space-y-4">
      <Toolbar editor={editor} />
      <div className="wysiwyg mx-auto w-full max-w-3xl px-4 py-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
