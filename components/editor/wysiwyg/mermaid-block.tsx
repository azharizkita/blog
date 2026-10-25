"use client";

import {
  Node,
  mergeAttributes,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import Mermaid from "@/components/mermaid";
import { dataAttr } from "./data-attr";

/**
 * A ```mermaid fenced block as an atomic editor node. Renders the site's
 * real Mermaid component; selecting the node exposes the diagram source in
 * a textarea. The optional height=NNN fence meta is kept in `height` (a
 * string, or null); the Markdown bridge reads and writes the fence.
 */
export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: dataAttr("code", ""),
      height: dataAttr("height", null),
    };
  },

  parseHTML() {
    return [{ tag: "div[data-mermaid-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-mermaid-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },
});

function MermaidBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  // The textarea edits the attr directly; Mermaid re-renders on chart change
  // (its own effect keys on `chart`), so no extra debounce state is needed —
  // but updates are applied on change with the component's cost being an
  // async dynamic import + render that Mermaid already tolerates.
  return (
    <NodeViewWrapper
      data-mermaid-block
      className={selected ? "rounded-md ring-2 ring-ring" : undefined}
    >
      <Mermaid
        chart={node.attrs.code}
        height={node.attrs.height ?? undefined}
      />
      {selected && (
        <textarea
          className="mt-2 w-full rounded-md border bg-background p-2 font-mono text-sm"
          rows={Math.min(12, Math.max(4, node.attrs.code.split("\n").length))}
          value={node.attrs.code}
          onChange={(event) => updateAttributes({ code: event.target.value })}
        />
      )}
    </NodeViewWrapper>
  );
}
