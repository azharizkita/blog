"use client";

import { useEffect, useRef } from "react";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
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
      //
      // This reads the DOM instead of next-themes' `useTheme().resolvedTheme`
      // (the pattern markdown-editor.tsx uses, gated by a
      // useSyncExternalStore mounted-check to avoid a hydration mismatch on
      // its always-visible first paint). Two things make that pattern both
      // wrong and unnecessary here: `resolvedTheme` is populated by an
      // ancestor effect that hasn't necessarily run yet when this once-only
      // editor creation happens, so it's typically still undefined at this
      // point even in dark mode — silently locking the fallback to "light"
      // forever; and there's nothing to mismatch anyway, since
      // `if (!editor) return null` below means both the SSR render and the
      // first client render are a no-op — the editor is only ever created
      // inside useEditor's client-side mount effect, after next-themes' own
      // pre-hydration inline script has already stamped `.dark` onto
      // `<html>` synchronously. Reading that class directly is therefore
      // both simpler and correct where `resolvedTheme` would not be. Do not
      // "fix" this by copying in the mounted-gate pattern.
      extensions: [
        ...createExtensions(
          typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark")
            ? "dark"
            : "light",
        ),
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
    // Created once on mount (deps: []). Contract: `value` is parsed once, at
    // mount, into the editor's initial content — this is a controlled-once,
    // not a controlled, component. A consumer that changes `value`
    // externally (loading different content into an already-mounted
    // instance) must remount this component (e.g. conditional render or a
    // `key`); a mounted editor ignores external `value` changes by design.
    // Theme is handled by CSS rather than a recreate (see the comment above).
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
