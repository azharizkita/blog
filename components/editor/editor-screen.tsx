"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  publishGist,
  renderPreview,
  saveDraft,
  updatePublished,
  type SaveResult,
} from "@/app/editor/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  WysiwygEditor,
  type WysiwygFlushResult,
} from "@/components/editor/wysiwyg";
import composeEntry, { type EntryInput } from "@/lib/compose-entry";
import extractTitle from "@/lib/extract-title";
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
  // Image-upload failures get their own prominent strip: the muted status
  // line sits by the save buttons and is easy to miss when a pasted image
  // silently disappears on a failed upload.
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  // The title lives in the document itself: its leading "## " heading (the
  // site's convention — ArticleContent promotes ## to the page h1). Old
  // gists whose content doesn't start with a heading fall back to the
  // metadata title they were loaded with, so they stay saveable unchanged.
  const deriveTitle = (markdown: string): string =>
    extractTitle(markdown) || entry.title;

  const composeOrReport = (title: string): string | null => {
    if (!title) {
      setStatus("Start the document with a title heading (## Title).");
      return null;
    }
    try {
      return composeEntry({ ...entry, title });
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
    // Source-mode image uploads park a placeholder in the text until they
    // settle (see markdown-editor.tsx); Write mode blocks via the blob-src
    // guard in the wysiwyg flush instead.
    if (value.includes("![Uploading image ")) {
      setStatus("An image is still uploading — wait a moment before saving.");
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
      const description = composeOrReport(deriveTitle(freshContent));
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
      const description = composeOrReport(deriveTitle(freshContent));
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

  const gistStatus = !gistId ? "New" : isPublic ? "Published" : "Draft";
  const slug = getSlug(deriveTitle(content));
  // Beep pages don't exist (app/[type]/[slug]/page.tsx 404s them) — no path.
  const slugPath =
    entry.type !== "Beep"
      ? `/${entry.type.toLowerCase()}/${slug || "…"}`
      : null;

  return (
    // Everything shares the root layout's max-w-3xl column — the document is
    // the layout's only spine, so the chrome always aligns with the text it
    // acts on.
    <div className="space-y-6">
      {/* Sticky action bar: status on the left, mode switch + save actions on
          the right. -mx-4 stretches its hairline across the column's px-4
          gutter so it reads as a bar, not a floating strip. */}
      <div className="sticky top-0 z-30 -mx-4 flex h-12 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/editor"
            aria-label="Back to editor"
            // -ml-1.5 cancels the icon button's internal glyph inset so the
            // arrow optically aligns with the column edge (title, content).
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "-ml-1.5",
            )}
          >
            <ArrowLeft />
          </Link>
          <p className="prose-muted truncate text-xs">
            {gistStatus}
            {slugPath && ` · ${slugPath}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            role="group"
            aria-label="Editor mode"
            className="flex items-center gap-0.5 rounded-2xl bg-muted p-0.5"
          >
            {(["write", "source", "preview"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                className={cn(
                  "h-6 rounded-[calc(1rem-2px)] px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  mode === m
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  // A stale banner (and a disarmed guard) must not survive a
                  // mode switch: if the underlying document is still broken,
                  // WysiwygEditor's mount-time round-trip check will simply
                  // set both again as soon as Write is entered. If the user
                  // fixed it in Source first, this is what actually clears
                  // the now-false "would rewrite" message instead of leaving
                  // it (and a permanently-disarmed "Edit visually anyway"
                  // landmine) around forever.
                  setRoundTripBroken(false);
                  forceWriteRef.current = false;
                  setMode(m);
                }}
              >
                {m === "write" ? "Write" : m === "source" ? "Source" : "Preview"}
              </button>
            ))}
          </div>

          {!isPublic && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              Save draft
            </Button>
          )}
          <Button size="sm" onClick={handlePublish} disabled={isSaving}>
            {isPublic ? "Save & rebuild" : "Publish"}
          </Button>
        </div>
      </div>

      {status && <p className="prose-muted text-sm">{status}</p>}

      {uploadError && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <p className="flex-1">{uploadError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUploadError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

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

      <MetadataBar value={entry} onChange={setEntry} />

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
          onImageError={setUploadError}
          flushRef={wysiwygFlushRef}
        />
      )}
      {mode === "source" && (
        <MarkdownEditor
          value={content}
          onChange={setContent}
          onUploadError={setUploadError}
        />
      )}
      {mode === "preview" && (
        <PreviewPane
          node={preview}
          error={previewError}
          isPending={isPreviewPending}
          version={previewVersion}
        />
      )}
    </div>
  );
}
