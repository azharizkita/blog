"use client";

import { useState } from "react";
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from "@tiptap/react";
import { SquarePlay } from "lucide-react";
import { YouTube } from "@/components/youtube-embed";
import { dataAttr } from "./data-attr";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * A YouTube video id from a bare id or any common YouTube link
 * (watch?v=, youtu.be/, /embed/, /shorts/, /live/, youtube-nocookie).
 * Returns null when the input is neither.
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    id =
      first === "watch"
        ? url.searchParams.get("v")
        : ["embed", "shorts", "live", "v"].includes(first ?? "")
          ? (second ?? null)
          : null;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * The `<!-- ::youtube id="…" title="…" -->` embed as an atomic editor node.
 * The node view renders the site's lite player; while selected, the video
 * (link or id) and its title are editable. Attrs hold the values as written
 * (decoded); the Markdown bridge owns the attribute encoding.
 */
export const YoutubeBlock = Node.create({
  name: "youtubeBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return { id: dataAttr("id", ""), title: dataAttr("title", null) };
  },

  parseHTML() {
    return [{ tag: "div[data-youtube-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-youtube-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YoutubeBlockView);
  },
});

function YoutubeBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const id: string = node.attrs.id ?? "";
  const title: string | null = node.attrs.title;
  return (
    <NodeViewWrapper
      data-youtube-block
      className={selected ? "rounded-md ring-2 ring-ring" : undefined}
    >
      {VIDEO_ID.test(id) ? (
        <YouTube id={id} title={title ?? undefined} />
      ) : (
        <span className="prose-muted flex aspect-video items-center justify-center gap-2 rounded-lg border border-dashed text-sm">
          <SquarePlay aria-hidden className="size-4" />
          Select this block and paste a YouTube link
        </span>
      )}
      {selected && (
        <span className="mx-auto mt-2 flex max-w-md flex-col gap-1 text-sm">
          <span className="flex items-baseline gap-1.5">
            <span className="flex-none">video:</span>
            <LineInput
              key={`id:${id}`}
              label="YouTube link or video id"
              placeholder="https://youtu.be/…"
              initial={id}
              onCommit={(next) => {
                const parsed = parseYouTubeId(next);
                // Keep what was typed when it isn't a link or id, so the
                // author sees it and can fix it (an id the player can't show
                // still saves as written).
                updateAttributes({ id: parsed ?? next.trim() });
              }}
            />
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="flex-none">title:</span>
            <LineInput
              key={`title:${title ?? ""}`}
              label="Video title"
              placeholder="Optional"
              initial={title ?? ""}
              onCommit={(next) => updateAttributes({ title: next.trim() || null })}
            />
          </span>
        </span>
      )}
    </NodeViewWrapper>
  );
}

/** Local-state input committing on blur/Enter — the caption/note pattern
 * (per-keystroke attr commits re-render the node view and steal focus). */
function LineInput({
  label,
  placeholder,
  initial,
  onCommit,
}: {
  label: string;
  placeholder: string;
  initial: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <input
      aria-label={label}
      placeholder={placeholder}
      className="prose-muted min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/40"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[\r\n]/g, ""))}
      onMouseDown={(event) => event.stopPropagation()}
      onFocus={() => window.getSelection()?.removeAllRanges()}
      onBlur={() => {
        if (draft !== initial) onCommit(draft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
