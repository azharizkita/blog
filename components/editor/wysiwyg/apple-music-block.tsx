"use client";

import { useState } from "react";
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  nodePasteRule,
  type NodeViewProps,
} from "@tiptap/react";
import { Music } from "lucide-react";
import { AppleMusic, toAppleMusicEmbedUrl } from "@/components/apple-music-embed";
import { dataAttr } from "./data-attr";

/** Pasted Apple embed snippets arrive as text, so the iframe tag is matched
 * in the text itself and reduced to its src. */
export const IFRAME_PASTE =
  /<iframe[^>]*\ssrc="(https:\/\/embed\.music\.apple\.com\/[^"]+)"[^>]*>(?:<\/iframe>)?/g;

/** A bare Apple Music share link also converts. The lookbehind keeps this
 * rule off the URL inside an iframe's src="…" (the rule above owns that). */
export const URL_PASTE = /(?<!")https:\/\/(?:embed\.)?music\.apple\.com\/\S+/g;

/** The iframe snippet is HTML, so its src carries `&amp;`/`&quot;`. */
const decodeHtmlAttr = (value: string) =>
  value.replaceAll("&quot;", '"').replaceAll("&amp;", "&");

/**
 * The `<!-- ::apple-music url="…" -->` embed as an atomic editor node — same
 * shape as the envelope block: the node view renders the real player, and
 * paste rules convert Apple's iframe snippet or a plain music.apple.com link
 * straight into the block. `url` and `title` hold the values as written
 * (decoded); the Markdown bridge owns the attribute encoding. `title` has no
 * editor UI and is kept as loaded.
 */
export const AppleMusicBlock = Node.create({
  name: "appleMusicBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return { url: dataAttr("url", ""), title: dataAttr("title", null) };
  },

  parseHTML() {
    return [{ tag: "div[data-apple-music-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-apple-music-block": "" }),
    ];
  },

  addPasteRules() {
    const toNode = (url: string) => ({ url: url.trim(), title: null });
    return [
      nodePasteRule({
        find: IFRAME_PASTE,
        type: this.type,
        getAttributes: (match) => toNode(decodeHtmlAttr(match[1])),
      }),
      nodePasteRule({
        find: URL_PASTE,
        type: this.type,
        getAttributes: (match) => toNode(match[0]),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AppleMusicBlockView);
  },

});

function AppleMusicBlockView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const url: string = node.attrs.url;
  const valid = toAppleMusicEmbedUrl(url) !== null;
  return (
    <NodeViewWrapper
      data-apple-music-block
      className={selected ? "rounded-md ring-2 ring-ring" : undefined}
    >
      {valid ? (
        <AppleMusic url={url} title={node.attrs.title ?? undefined} />
      ) : (
        <span className="prose-muted flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed text-sm">
          <Music aria-hidden className="size-4" />
          Select this block and paste an Apple Music link
        </span>
      )}
      {selected && (
        <span className="mx-auto mt-2 flex max-w-md items-baseline gap-1.5 text-sm">
          <span className="flex-none">link:</span>
          <UrlInput
            key={node.attrs.url}
            initialUrl={url}
            onCommit={(next) => updateAttributes({ url: next })}
          />
        </span>
      )}
    </NodeViewWrapper>
  );
}

/** Local-state input committing on blur/Enter — the caption/note pattern
 * (per-keystroke attr commits re-render the node view and steal focus). */
function UrlInput({
  initialUrl,
  onCommit,
}: {
  initialUrl: string;
  onCommit: (url: string) => void;
}) {
  const [draft, setDraft] = useState(initialUrl);
  return (
    <input
      aria-label="Apple Music link"
      placeholder="https://music.apple.com/…"
      className="prose-muted min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/40"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[\r\n]/g, ""))}
      onMouseDown={(event) => event.stopPropagation()}
      onFocus={() => window.getSelection()?.removeAllRanges()}
      onBlur={() => {
        if (draft.trim() !== initialUrl) onCommit(draft.trim());
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
