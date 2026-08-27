"use client";

import { useEffect, useRef, type RefObject } from "react";
import { EditorContent, Extension, useEditor, type Editor } from "@tiptap/react";
import type { MarkdownStorage } from "tiptap-markdown";
import { setUploadErrorHandler } from "@/components/editor/upload-error-registry";
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

export type WysiwygFlushResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string };

export interface WysiwygEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  onRoundTripFail: (serialized: string) => void;
  /**
   * Called instead of `onChange` whenever a serialize would silently commit
   * a lossy tiptap-markdown fallback placeholder (see
   * `detectLossySerialization` below). The caller should surface this as an
   * error rather than treat it as a normal content update.
   */
  onSerializeError?: (message: string) => void;
  /**
   * Populated (after mount) with an imperative flush function: clears any
   * pending debounce and synchronously returns the current document as
   * markdown, running the same lossy-serialization check as `onChange`.
   * For callers (Save/Publish) that need guaranteed-fresh, guaranteed-safe
   * content instead of waiting for the next debounced `onChange`.
   */
  flushRef?: RefObject<(() => WysiwygFlushResult) | null>;
  /** Surface for paste/drop image-upload failures (see image-upload.ts). */
  onImageError?: (message: string) => void;
}

/**
 * tiptap-markdown (configured with `html: false`) falls back to a literal
 * "[nodeName]" placeholder for any node it can't represent in plain GFM —
 * see node_modules/tiptap-markdown's built `dist/tiptap-markdown.es.js`,
 * `HTMLNode`'s `addStorage().markdown.serialize`:
 * `state.write(\`[${node.type.name}]\`)` (plus `state.closeBlock(node)`
 * since a fallback node is always block-level in this schema). Tracing the
 * rest of that file: every node/mark type in this editor's schema is
 * properly covered *except* two specific shapes that TableEnterGuard (see
 * extensions.ts) prevents from being created through the UI, but which
 * could still arrive via paste:
 *  - `table`: covered by a real GFM serializer (`Table$1`), but only when
 *    every cell has exactly one child block (`isMarkdownSerializable`) — a
 *    cell with 2+ paragraphs, or a header/body shape mismatch, makes the
 *    *whole table* fall back to a standalone `[table]` block/line.
 *  - `hardBreak`: covered by a real serializer (`HardBreak$1`) that itself
 *    special-cases `state.inTable` and defers to the same HTMLNode
 *    fallback — so a hard break inside a table cell renders as a literal
 *    `[hardBreak]` embedded *inline* within that row's cell text (not a
 *    standalone line, since the table serializer renders cell content via
 *    `state.renderInline`, not the top-level block dispatcher).
 * (A third gap — `underline`, not in tiptap-markdown's covered mark list —
 * is closed by disabling the mark entirely in extensions.ts instead, since
 * it isn't part of this editor's supported feature set.)
 */
function detectLossySerialization(
  editor: Editor,
  serialized: string,
): string | null {
  let hasTable = false;
  let hasHardBreak = false;
  let hasPendingUpload = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "table") hasTable = true;
    if (node.type.name === "hardBreak") hasHardBreak = true;
    if (
      node.type.name === "image" &&
      typeof node.attrs.src === "string" &&
      node.attrs.src.startsWith("blob:")
    ) {
      // A paste/drop upload still in flight (see image-upload.ts) — its
      // local object URL must never be committed to content or saved.
      hasPendingUpload = true;
    }
  });
  if (hasPendingUpload) {
    return "An image is still uploading — wait a moment before saving.";
  }
  if (hasTable && /(^|\n)\[table\](\n|$)/.test(serialized)) {
    return "This table can't be saved as Markdown: a cell has more than one paragraph, or the header/body shape doesn't match. Undo the change, or fix it in Source mode.";
  }
  if (hasHardBreak && serialized.includes("[hardBreak]")) {
    return "A line break inside a table cell can't be saved as Markdown. Remove it, or fix it in Source mode.";
  }
  return null;
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
  onSerializeError,
  flushRef,
  onImageError,
}: WysiwygEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest-value refs for the unmount-flush and flushRef-registration
  // effects below, both declared with `[]` deps and therefore only ever
  // seeing the bindings from the very first render (before `editor` even
  // exists, since immediatelyRender is false) unless they read through refs
  // kept current on every render.
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const onSerializeErrorRef = useRef(onSerializeError);

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
        // A new/empty document has nothing to protect — and TitleDocument's
        // schema seeds it with an empty title heading that serializes as
        // "##", which would falsely trip the guard against the empty string.
        if (!value.trim()) return;
        const serialized = editor.storage.markdown.getMarkdown();
        if (!roundTrips(value, serialized)) {
          onRoundTripFail(serialized);
        }
      },
      onUpdate({ editor }) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          // Reset to null once the timer actually fires, not just when it's
          // cleared — the unmount-flush effect below treats "non-null" as
          // "an edit is pending" and would otherwise re-flush a change
          // that's already been delivered.
          debounceRef.current = null;
          const serialized = editor.storage.markdown.getMarkdown();
          const lossyError = detectLossySerialization(editor, serialized);
          if (lossyError) {
            onSerializeError?.(lossyError);
            return;
          }
          onChange(serialized);
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

  // No deps: runs after every render, purely to keep the refs current for
  // the mount-only effects below.
  useEffect(() => {
    editorRef.current = editor;
    onChangeRef.current = onChange;
    onSerializeErrorRef.current = onSerializeError;
    // The image-upload extension reports errors via the registry keyed by
    // the editor instance; registering here (every render) keeps it pointed
    // at the latest prop.
    if (editor) {
      setUploadErrorHandler(editor, onImageError);
    }
  });

  useEffect(() => {
    return () => {
      // A pending debounce timer means the last edit hasn't reached the
      // parent yet. Task 3 fully unmounts this component on every mode
      // switch away from Write (required by the value-is-parsed-once
      // contract above), and useEditor defers the actual editor.destroy()
      // call by one macrotask past this synchronous cleanup (see the
      // effect-ordering note in the fix report), so `editorRef.current` is
      // still a live, readable editor here — flush the latest markdown to
      // the parent instead of discarding it. An unmount with nothing
      // pending must not call onChange (or onSerializeError) at all.
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        const currentEditor = editorRef.current;
        if (currentEditor && !currentEditor.isDestroyed) {
          const serialized = currentEditor.storage.markdown.getMarkdown();
          const lossyError = detectLossySerialization(
            currentEditor,
            serialized,
          );
          if (lossyError) {
            onSerializeErrorRef.current?.(lossyError);
          } else {
            onChangeRef.current(serialized);
          }
        }
      }
    };
  }, []);

  // Populates `flushRef` (if given) with an imperative flush: clears any
  // pending debounce and synchronously returns the current document as
  // markdown — or a serialize-error indicator, running the same
  // lossy-serialization check as onUpdate/unmount above — for callers
  // (Save/Publish) that need guaranteed-fresh, guaranteed-safe content
  // instead of waiting for the next debounced onChange.
  useEffect(() => {
    if (!flushRef) return;
    flushRef.current = (): WysiwygFlushResult => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const currentEditor = editorRef.current;
      if (!currentEditor || currentEditor.isDestroyed) {
        return { ok: false, error: "The editor isn't ready yet." };
      }
      try {
        const serialized = currentEditor.storage.markdown.getMarkdown();
        const lossyError = detectLossySerialization(currentEditor, serialized);
        if (lossyError) return { ok: false, error: lossyError };
        return { ok: true, markdown: serialized };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to serialize the document.",
        };
      }
    };
    return () => {
      if (flushRef) flushRef.current = null;
    };
  }, [flushRef]);

  if (!editor) return null;

  return (
    // The parent column already is the article column (max-w-3xl with px-4
    // from the root layout), so the editor renders in place — no inner
    // centering. The toolbar sticks just below the screen's h-12 action bar.
    <div className="space-y-6">
      <Toolbar editor={editor} />
      <div className="wysiwyg pb-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
