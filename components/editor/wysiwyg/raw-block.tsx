"use client";

import {
  Node,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from "@tiptap/react";
import { Lock } from "lucide-react";
import { dataAttr } from "./data-attr";

/**
 * A top-level block the editor can't hold exactly (bridge/to-doc.ts makes
 * it raw: a footnote, an aligned table, a loose list, unknown HTML, …),
 * kept as its exact Markdown `source` and written back byte for byte. It is
 * locked: the source is shown, not editable here (Source mode edits it);
 * the block can still be selected or deleted as a whole.
 */
export const RawBlock = Node.create({
  name: "rawBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return { source: dataAttr("source", "") };
  },

  parseHTML() {
    return [{ tag: "div[data-raw-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-raw-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RawBlockView);
  },
});

function RawBlockView({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper
      data-raw-block
      contentEditable={false}
      className={
        "rounded-md border border-dashed bg-muted/30 px-4 py-3" +
        (selected ? " ring-2 ring-ring" : "")
      }
    >
      <span
        title="Edit this block in Source mode"
        className="prose-muted mb-2 flex items-center gap-1.5 text-xs select-none"
      >
        <Lock aria-hidden className="size-3" />
        Kept exactly as written
      </span>
      <div className="font-mono text-sm whitespace-pre-wrap wrap-break-word">
        {node.attrs.source}
      </div>
    </NodeViewWrapper>
  );
}
