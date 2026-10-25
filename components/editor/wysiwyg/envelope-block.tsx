"use client";

import { useState } from "react";
import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from "@tiptap/react";
import { Envelope } from "@/components/lottie/envelope";
import { dataAttr } from "./data-attr";

/**
 * The `<!-- ::envelope text="…" -->` embed as an atomic editor node: renders
 * the real animated component in Write mode (like the mermaid block), with
 * the note text editable while selected. `text` holds the note as written
 * (decoded); the Markdown bridge (bridge/to-doc.ts, bridge/to-markdown.ts)
 * owns the attribute encoding.
 */
export const EnvelopeBlock = Node.create({
  name: "envelopeBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return { text: dataAttr("text", "") };
  },

  parseHTML() {
    return [{ tag: "div[data-envelope-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-envelope-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EnvelopeBlockView);
  },
});

function EnvelopeBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      data-envelope-block
      className={selected ? "rounded-md ring-2 ring-ring" : undefined}
    >
      <Envelope text={node.attrs.text} />
      {selected && (
        <span className="mx-auto mt-2 flex max-w-md items-baseline gap-1.5 text-sm">
          <span className="flex-none">note:</span>
          <NoteInput
            key={node.attrs.text}
            initialText={node.attrs.text}
            onCommit={(next) => updateAttributes({ text: next })}
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
