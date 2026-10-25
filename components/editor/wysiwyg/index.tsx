"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  EditorContent,
  Extension,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { setUploadErrorHandler } from "@/components/editor/upload-error-registry";
import { markdownToDoc, type MarkdownDoc } from "./bridge/to-doc";
import { createExtensions } from "./extensions";
import { docToMarkdown } from "./bridge/to-markdown";
import { checkSave, type SaveCheck } from "./save-guard";
import { Toolbar, promptForLink } from "./toolbar";

const CHANGE_DEBOUNCE_MS = 300;

const PENDING_UPLOAD = "An image is still uploading — wait a moment before saving.";

export type SaveGuardFailure = Extract<SaveCheck, { ok: false }>;

export type WysiwygFlushResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string; guard?: SaveGuardFailure };

/** Imperative handle populated through `flushRef` (after mount). */
export interface WysiwygHandle {
  /** Clears any pending debounce and serializes through the save guard. */
  flush(): WysiwygFlushResult;
  /**
   * Replaces the top-level node at `index` with the one loaded there.
   * Returns false when nothing was loaded at that index.
   */
  restoreBlock(index: number): boolean;
  /**
   * Serializes without the lossy check (Check B): for "I deleted it on
   * purpose". Still refuses a document Markdown can't hold.
   */
  forceSerialize(): WysiwygFlushResult;
  /** Whether a block was loaded at `index` (so Restore can be offered). */
  canRestore(index: number): boolean;
}

export interface WysiwygEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  /**
   * Called instead of `onChange` whenever the document can't be saved
   * without losing something (the save guard refused it; see
   * save-guard.ts). The caller should surface this as an error rather than
   * treat it as a normal content update.
   */
  onSerializeError?: (message: string) => void;
  /**
   * Populated (after mount) with an imperative flush function: clears any
   * pending debounce and synchronously returns the current document as
   * Markdown, through the same save guard as `onChange`. For callers
   * (Save/Publish) that need guaranteed-fresh, guaranteed-safe content
   * instead of waiting for the next debounced `onChange`.
   */
  flushRef?: RefObject<WysiwygHandle | null>;
  /**
   * Reports the outcome of every debounced save check (true = the document
   * would save exactly as shown).
   */
  onCheck?: (ok: boolean) => void;
  /** Surface for paste/drop image-upload failures (see image-upload.ts). */
  onImageError?: (message: string) => void;
}

/** A paste/drop upload still in flight (see image-upload.ts): its local
 * object URL must never be committed to content or saved. */
function hasPendingUpload(editor: Editor): boolean {
  let pending = false;
  editor.state.doc.descendants((node) => {
    if (
      node.type.name === "image" &&
      typeof node.attrs.src === "string" &&
      node.attrs.src.startsWith("blob:")
    ) {
      pending = true;
    }
    return !pending;
  });
  return pending;
}

/**
 * Serializes the editor's document through the save guard. `loadedDoc` is
 * the editor's top-level JSON as loaded: the bridge's JSON read through the
 * editor's schema, exactly what the editor was created with (computed from
 * the schema rather than read from the live editor, so no transaction can
 * have touched it yet).
 */
function createSerializer(loaded: MarkdownDoc) {
  let loadedDoc: JSONContent[] | null = null;
  const loadedNodes = (editor: Editor): JSONContent[] =>
    (loadedDoc ??= editor.schema.nodeFromJSON(loaded.doc).toJSON().content ?? []);
  const failure = (error: unknown): WysiwygFlushResult => ({
    ok: false,
    error:
      error instanceof Error ? error.message : "Failed to serialize the document.",
  });
  return {
    loadedNodes,
    serialize(editor: Editor): WysiwygFlushResult {
      if (hasPendingUpload(editor)) return { ok: false, error: PENDING_UPLOAD };
      try {
        const result = checkSave({
          loaded: loaded.blocks,
          loadedDoc: loadedNodes(editor),
          doc: editor.getJSON(),
          definitions: loaded.definitions,
        });
        return result.ok
          ? { ok: true, markdown: result.markdown }
          : { ok: false, error: result.message, guard: result };
      } catch (error) {
        return failure(error);
      }
    },
    /** Like `serialize`, minus the lossy check; an UnserializableError still fails. */
    forceSerialize(editor: Editor): WysiwygFlushResult {
      if (hasPendingUpload(editor)) return { ok: false, error: PENDING_UPLOAD };
      try {
        return {
          ok: true,
          markdown: docToMarkdown(editor.getJSON(), loaded.definitions, {
            syntheticTitle: loaded.blocks[0]?.synthetic === true,
          }),
        };
      } catch (error) {
        return failure(error);
      }
    },
  };
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

/**
 * Write mode. The document is loaded through the Markdown bridge
 * (bridge/to-doc.ts) and saved through the save guard (save-guard.ts):
 * every post opens here, blocks the editor can't hold exactly stay locked
 * raw blocks, and nothing is handed to `onChange` or the flush unless it
 * provably reads back as what is on screen.
 *
 * Code blocks are coloured by CodeHighlight (code-highlight.ts), which
 * never dispatches. It replaced tiptap-extension-code-block-shiki, whose
 * plugin view dispatched `view.state.tr` after its highlighter loaded
 * asynchronously: React's dev double-mount and EditorContent's plugin
 * (un)registration left several plugin views pending on one EditorView,
 * and once that editor was destroyed (Write→Source on mount, when the old
 * round-trip check failed) TipTap's dispatch guard read its not-mounted
 * proxy view (`isDestroyed: false`), applied the first stale dispatch to the
 * detached editor state (TrailingNode appended a node), and every later
 * one, built from the destroyed view's older state, threw "Applying a
 * mismatched transaction".
 */
export function WysiwygEditor({
  value,
  onChange,
  onSerializeError,
  flushRef,
  onCheck,
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
  const onCheckRef = useRef(onCheck);
  // Parsed once, at mount (see the contract below); the serializer keeps the
  // loaded blocks the save guard compares against.
  const [loaded] = useState(() => markdownToDoc(value));
  const [serializer] = useState(() => createSerializer(loaded));

  const editor = useEditor(
    {
      extensions: [...createExtensions(), LinkShortcut],
      content: loaded.doc,
      // SSR safety: render nothing on the server; mount client-side only.
      immediatelyRender: false,
      onUpdate({ editor }) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          // Reset to null once the timer actually fires, not just when it's
          // cleared — the unmount-flush effect below treats "non-null" as
          // "an edit is pending" and would otherwise re-flush a change
          // that's already been delivered.
          debounceRef.current = null;
          // An upload in flight finishes with its own transaction, which
          // schedules the next update; nothing to report meanwhile.
          if (hasPendingUpload(editor)) return;
          const result = serializer.serialize(editor);
          onCheckRef.current?.(result.ok);
          if (result.ok) onChange(result.markdown);
          else onSerializeError?.(result.error);
        }, CHANGE_DEBOUNCE_MS);
      },
    },
    // Created once on mount (deps: []). Contract: `value` is parsed once, at
    // mount, into the editor's initial content — this is a controlled-once,
    // not a controlled, component. A consumer that changes `value`
    // externally (loading different content into an already-mounted
    // instance) must remount this component (e.g. conditional render or a
    // `key`); a mounted editor ignores external `value` changes by design.
    [],
  );

  // No deps: runs after every render, purely to keep the refs current for
  // the mount-only effects below.
  useEffect(() => {
    editorRef.current = editor;
    onChangeRef.current = onChange;
    onSerializeErrorRef.current = onSerializeError;
    onCheckRef.current = onCheck;
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
      // parent yet. The screen fully unmounts this component on every mode
      // switch away from Write (required by the value-is-parsed-once
      // contract above), and useEditor defers the actual editor.destroy()
      // call by one macrotask past this synchronous cleanup, so
      // `editorRef.current` is still a live, readable editor here — flush
      // the latest Markdown to the parent instead of discarding it. An
      // unmount with nothing pending must not call onChange (or
      // onSerializeError) at all.
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        const currentEditor = editorRef.current;
        if (currentEditor && !currentEditor.isDestroyed) {
          const result = serializer.serialize(currentEditor);
          if (result.ok) onChangeRef.current(result.markdown);
          else onSerializeErrorRef.current?.(result.error);
        }
      }
    };
  }, [serializer]);

  // Populates `flushRef` (if given) with an imperative flush: clears any
  // pending debounce and synchronously returns the current document as
  // Markdown, or why it can't be saved (a pending upload, or the save
  // guard's verdict in `guard`), for callers (Save/Publish) that need
  // guaranteed-fresh, guaranteed-safe content instead of waiting for the
  // next debounced onChange.
  useEffect(() => {
    if (!flushRef) return;
    const live = (): Editor | null => {
      const e = editorRef.current;
      return e && !e.isDestroyed ? e : null;
    };
    const clearPending = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
    const notReady: WysiwygFlushResult = {
      ok: false,
      error: "The editor isn't ready yet.",
    };
    flushRef.current = {
      flush() {
        clearPending();
        const e = live();
        return e ? serializer.serialize(e) : notReady;
      },
      forceSerialize() {
        clearPending();
        const e = live();
        return e ? serializer.forceSerialize(e) : notReady;
      },
      canRestore(index) {
        const e = live();
        return !!e && index >= 0 && index < serializer.loadedNodes(e).length;
      },
      restoreBlock(index) {
        const e = live();
        if (!e) return false;
        const original = serializer.loadedNodes(e)[index];
        const current = e.state.doc.maybeChild(index);
        if (!original) return false;
        const { state, view } = e;
        let from = 0;
        for (let i = 0; i < Math.min(index, state.doc.childCount); i++) {
          from += state.doc.child(i).nodeSize;
        }
        const node = e.schema.nodeFromJSON(original);
        const tr = current
          ? state.tr.replaceWith(from, from + current.nodeSize, node)
          : state.tr.insert(state.doc.content.size, node);
        view.dispatch(tr);
        return true;
      },
    };
    return () => {
      if (flushRef) flushRef.current = null;
    };
  }, [flushRef, serializer]);

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
