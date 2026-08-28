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
import type { MarkdownNodeSpec } from "tiptap-markdown";
import { AppleMusic, toAppleMusicEmbedUrl } from "@/components/apple-music-embed";

/** `<AppleMusic url="…" />` lines in the article source. JSX attribute
 * values decode HTML entities, so quotes/ampersands round-trip encoded. */
const APPLE_MUSIC_LINE = /^<AppleMusic\s+url="([^"]*)"\s*\/>\s*$/;

/** Pasted Apple embed snippets arrive as escaped text (html:false), so the
 * iframe tag is matched in the text itself and reduced to its src. */
const IFRAME_PASTE =
  /<iframe[^>]*\ssrc="(https:\/\/embed\.music\.apple\.com\/[^"]+)"[^>]*>(?:<\/iframe>)?/g;

/** A bare Apple Music share link also converts. The lookbehind keeps this
 * rule off the URL inside an iframe's src="…" (the rule above owns that). */
const URL_PASTE = /(?<!")https:\/\/(?:embed\.)?music\.apple\.com\/\S+/g;

const encodeAttr = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
const decodeAttr = (value: string) =>
  value.replaceAll("&quot;", '"').replaceAll("&amp;", "&");

/**
 * The AppleMusic MDX component as an atomic editor node — same shape as the
 * envelope block: symmetric markdown parse/serialize keeps articles with
 * embeds Write-editable past the round-trip guard, the node view renders
 * the real player, and paste rules convert Apple's iframe snippet or a
 * plain music.apple.com link straight into the block.
 */
export const AppleMusicBlock = Node.create({
  name: "appleMusicBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return { url: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-apple-music-block]",
        getAttrs: (element) => ({
          url: element.getAttribute("data-url") ?? "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-apple-music-block": "",
        "data-url": node.attrs.url,
      }),
    ];
  },

  addPasteRules() {
    const toNode = (url: string) => ({ url: decodeAttr(url.trim()) });
    return [
      nodePasteRule({
        find: IFRAME_PASTE,
        type: this.type,
        getAttributes: (match) => toNode(match[1]),
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

  addStorage(): { markdown: MarkdownNodeSpec } {
    return {
      markdown: {
        serialize(state, node) {
          state.write(`<AppleMusic url="${encodeAttr(node.attrs.url)}" />`);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            // A block rule ahead of `paragraph`, so the JSX line becomes
            // this node instead of escaped text (see envelope-block).
            markdownit.block.ruler.before(
              "paragraph",
              "appleMusic",
              (state, startLine, _endLine, silent) => {
                const start = state.bMarks[startLine] + state.tShift[startLine];
                const line = state.src.slice(start, state.eMarks[startLine]);
                const match = APPLE_MUSIC_LINE.exec(line);
                if (!match) return false;
                if (silent) return true;
                const token = state.push("html_block", "", 0);
                token.content = `<div data-apple-music-block data-url="${match[1]}"></div>`;
                token.map = [startLine, startLine + 1];
                state.line = startLine + 1;
                return true;
              },
            );
          },
        },
      },
    };
  },
});

function AppleMusicBlockView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const url = decodeAttr(node.attrs.url);
  const valid = toAppleMusicEmbedUrl(url) !== null;
  return (
    <NodeViewWrapper
      data-apple-music-block
      className={selected ? "rounded-md ring-2 ring-ring" : undefined}
    >
      {valid ? (
        <AppleMusic url={url} />
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
            onCommit={(next) => updateAttributes({ url: encodeAttr(next) })}
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
      onBlur={() => onCommit(draft.trim())}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
