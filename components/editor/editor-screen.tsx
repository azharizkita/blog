"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  publishGist,
  renderPreview,
  saveDraft,
  updatePublished,
  type SaveResult,
} from "@/app/editor/actions";
import { Button } from "@/components/ui/button";
import {
  WysiwygEditor,
  type WysiwygFlushResult,
} from "@/components/editor/wysiwyg";
import composeEntry, { type EntryInput } from "@/lib/compose-entry";
import getSlug from "@/lib/get-slug";
import { MarkdownEditor } from "./markdown-editor";
import { MetadataBar } from "./metadata-bar";
import { PreviewPane } from "./preview-pane";

const PREVIEW_DEBOUNCE_MS = 600;

type EditorMode = "write" | "source" | "preview";

export interface EditorScreenProps {
  gistId?: string;
  isPublic?: boolean;
  initialContent?: string;
  initialEntry?: EntryInput;
}

export function EditorScreen(props: EditorScreenProps) {
  const router = useRouter();
  const [gistId, setGistId] = useState(props.gistId);
  const [isPublic, setIsPublic] = useState(props.isPublic ?? false);
  const [content, setContent] = useState(props.initialContent ?? "");
  const [entry, setEntry] = useState<EntryInput>(
    props.initialEntry ?? { type: "Blog", title: "", description: "" },
  );
  const [preview, setPreview] = useState<ReactNode>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPreviewPending, startPreview] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const previewRequestRef = useRef(0);
  const [mode, setMode] = useState<EditorMode>("write");
  const [roundTripBroken, setRoundTripBroken] = useState(false);
  const forceWriteRef = useRef(false);
  const wysiwygFlushRef = useRef<(() => WysiwygFlushResult) | null>(null);

  // Debounced exact-pipeline preview: the server action renders the real
  // ArticleContent component, so the preview can't drift from production.
  // Only fetch while the preview mode is actually visible; entering preview
  // re-runs this effect via the `mode` dependency, which is what kicks off
  // the first render for the current content.
  useEffect(() => {
    if (mode !== "preview") return;
    const handle = setTimeout(() => {
      const requestId = ++previewRequestRef.current;
      startPreview(async () => {
        const result = await renderPreview(content);
        if (previewRequestRef.current !== requestId) return;
        if (result.ok) {
          setPreview(result.node);
          setPreviewVersion((version) => version + 1);
          setPreviewError(null);
        } else {
          // Keep the last good render visible under the error strip.
          setPreviewError(result.error);
        }
      });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [content, mode]);

  const composeOrReport = (): string | null => {
    try {
      return composeEntry(entry);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  const requireContent = (value: string): boolean => {
    if (!value.trim()) {
      setStatus("Content is required.");
      return false;
    }
    return true;
  };

  // WysiwygEditor debounces onChange by 300ms (it resets on every
  // keystroke), so `content` can lag behind what's on screen for an
  // unbounded time while the user is still typing — saving `content`
  // directly could silently publish a stale document. In Write mode, flush
  // the editor synchronously first and use its *return value* directly for
  // this save (not `content`, which wouldn't have updated yet by the time
  // the save actually runs): null signals the save must be aborted, either
  // because the document can't currently be serialized safely (the same
  // lossy-table/hardBreak guard as onChange — see wysiwyg/index.tsx) or
  // because of some other serialize failure; the error is already reported
  // via setStatus in that case.
  const flushWriteModeContent = (): string | null => {
    if (mode !== "write" || !wysiwygFlushRef.current) return content;
    const result = wysiwygFlushRef.current();
    if (!result.ok) {
      setStatus(result.error);
      return null;
    }
    setContent(result.markdown);
    return result.markdown;
  };

  const reportSave = (result: SaveResult, verb: string) => {
    if (!result.ok) {
      setStatus(result.error);
      return null;
    }
    setStatus(
      [`${verb}.`, ...result.warnings, result.rebuild?.message]
        .filter(Boolean)
        .join(" "),
    );
    return result;
  };

  const handleSaveDraft = () => {
    startSaving(async () => {
      setStatus(null);
      const freshContent = flushWriteModeContent();
      if (freshContent === null) return;
      if (!requireContent(freshContent)) return;
      const description = composeOrReport();
      if (description === null) return;
      const result = reportSave(
        await saveDraft({ gistId, description, content: freshContent }),
        "Draft saved (secret gist)",
      );
      if (!result) return;
      setGistId(result.gistId);
      if (!props.gistId) router.replace(`/editor/${result.gistId}`);
    });
  };

  const handlePublish = () => {
    startSaving(async () => {
      setStatus(null);
      const freshContent = flushWriteModeContent();
      if (freshContent === null) return;
      if (!requireContent(freshContent)) return;
      const description = composeOrReport();
      if (description === null) return;

      if (isPublic && gistId) {
        reportSave(
          await updatePublished({ gistId, description, content: freshContent }),
          "Saved",
        );
        return;
      }

      const result = reportSave(
        await publishGist({
          draftGistId: gistId,
          description,
          content: freshContent,
        }),
        "Published",
      );
      if (!result) return;
      setGistId(result.gistId);
      setIsPublic(true);
      router.replace(`/editor/${result.gistId}`);
    });
  };

  const gistStatus = !gistId ? "new" : isPublic ? "published" : "draft";

  return (
    // Full-bleed breakout: the root layout caps <main> at max-w-3xl, which is
    // too narrow for a split view. The preview column re-applies the real
    // article width internally, so fidelity is unaffected.
    <div className="relative left-1/2 w-dvw -translate-x-1/2 space-y-4 px-4">
      <MetadataBar
        value={entry}
        onChange={setEntry}
        slug={getSlug(entry.title)}
        status={gistStatus}
      />

      <div className="flex items-center gap-1">
        {(["write", "source", "preview"] as const).map((m) => (
          <Button
            key={m}
            variant={mode === m ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              // A stale banner (and a disarmed guard) must not survive a
              // mode switch: if the underlying document is still broken,
              // WysiwygEditor's mount-time round-trip check will simply set
              // both again as soon as Write is entered. If the user fixed
              // it in Source first, this is what actually clears the
              // now-false "would rewrite" message instead of leaving it (and
              // a permanently-disarmed "Edit visually anyway" landmine)
              // around forever.
              setRoundTripBroken(false);
              forceWriteRef.current = false;
              setMode(m);
            }}
          >
            {m === "write" ? "Write" : m === "source" ? "Source" : "Preview"}
          </Button>
        ))}
      </div>

      {roundTripBroken && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <p className="flex-1">
            This document contains formatting the visual editor would rewrite.
            Editing in Source mode to keep it intact.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              forceWriteRef.current = true;
              setRoundTripBroken(false);
              setMode("write");
            }}
          >
            Edit visually anyway
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRoundTripBroken(false)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {mode === "write" && (
        <WysiwygEditor
          value={content}
          onChange={setContent}
          onRoundTripFail={() => {
            if (forceWriteRef.current) return;
            setRoundTripBroken(true);
            setMode("source");
          }}
          onSerializeError={setStatus}
          flushRef={wysiwygFlushRef}
        />
      )}
      {mode === "source" && (
        <MarkdownEditor value={content} onChange={setContent} />
      )}
      {mode === "preview" && (
        <PreviewPane
          node={preview}
          error={previewError}
          isPending={isPreviewPending}
          version={previewVersion}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!isPublic && (
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            Save draft
          </Button>
        )}
        <Button onClick={handlePublish} disabled={isSaving}>
          {isPublic ? "Save & rebuild" : "Publish"}
        </Button>
        {status && <p className="prose-muted text-sm">{status}</p>}
      </div>
    </div>
  );
}
