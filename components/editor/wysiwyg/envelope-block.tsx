"use client";

import { useState } from "react";
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from "@tiptap/react";
import type { MarkdownNodeSpec } from "tiptap-markdown";
import { Envelope } from "@/components/lottie/envelope";

/** `<Envelope text="…" />` lines in the article source. JSX attribute
 * values decode HTML entities, so quotes round-trip as &quot;. */
const ENVELOPE_LINE = /^<Envelope\s+text="([^"]*)"\s*\/>\s*$/;

const encodeAttr = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
const decodeAttr = (value: string) =>
  value.replaceAll("&quot;", '"').replaceAll("&amp;", "&");

/**
 * The Envelope MDX component as an atomic editor node: renders the real
 * animated component in Write mode (like the mermaid block), with the note
 * text editable while selected. Its symmetric markdown parse/serialize is
 * what lets envelope-bearing articles pass the round-trip guard and stay
 * Write-editable — other JSX still falls back to Source mode.
 */
export const EnvelopeBlock = Node.create({
  name: "envelopeBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return { text: { default: "" } };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-envelope-block]",
        getAttrs: (element) => ({
          text: element.getAttribute("data-text") ?? "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-envelope-block": "",
        "data-text": node.attrs.text,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EnvelopeBlockView);
  },

  addStorage(): { markdown: MarkdownNodeSpec } {
    return {
      markdown: {
        serialize(state, node) {
          state.write(`<Envelope text="${encodeAttr(node.attrs.text)}" />`);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            // A block rule ahead of `paragraph`, so the JSX line becomes
            // this node instead of escaped text (html:false would other-
            // wise mangle it and trip the round-trip guard).
            markdownit.block.ruler.before(
              "paragraph",
              "envelope",
              (state, startLine, _endLine, silent) => {
                const start = state.bMarks[startLine] + state.tShift[startLine];
                const line = state.src.slice(start, state.eMarks[startLine]);
                const match = ENVELOPE_LINE.exec(line);
                if (!match) return false;
                if (silent) return true;
                const token = state.push("html_block", "", 0);
                token.content = `<div data-envelope-block data-text="${match[1]}"></div>`;
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

function EnvelopeBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      data-envelope-block
      className={selected ? "rounded-md ring-2 ring-ring" : undefined}
    >
      <Envelope text={decodeAttr(node.attrs.text)} />
      {selected && (
        <span className="mx-auto mt-2 flex max-w-md items-baseline gap-1.5 text-sm">
          <span className="flex-none">note:</span>
          <NoteInput
            key={node.attrs.text}
            initialText={decodeAttr(node.attrs.text)}
            onCommit={(next) => updateAttributes({ text: encodeAttr(next) })}
          />
        </span>
      )}
    </NodeViewWrapper>
  );
}

/** Local-state input committing on blur/Enter — the same pattern as the
 * image caption (per-keystroke attr commits re-render the node view and
 * steal focus). Newlines are excluded by construction (single-line input;
 * the JSX attribute must stay one line). */
function NoteInput({
  initialText,
  onCommit,
}: {
  initialText: string;
  onCommit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(initialText);
  return (
    <input
      aria-label="Envelope note text"
      placeholder="Write the note…"
      className="prose-muted min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/40"
      value={draft}
      onChange={(event) => setDraft(event.target.value.replace(/[\r\n]/g, " "))}
      onMouseDown={(event) => event.stopPropagation()}
      onFocus={() => window.getSelection()?.removeAllRanges()}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
