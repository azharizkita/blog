"use client";

import {
  Node,
  mergeAttributes,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import type { MarkdownNodeSpec } from "tiptap-markdown";
import Mermaid from "@/components/mermaid";

/**
 * A ```mermaid fenced block as an atomic editor node. Renders the site's
 * real Mermaid component; selecting the node exposes the diagram source in
 * a textarea. The optional height=NNN fence meta is preserved as an attr.
 */
export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: { default: "" },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-mermaid-block]",
        getAttrs: (element) => ({
          code: (element as HTMLElement).getAttribute("data-code") ?? "",
          height:
            (element as HTMLElement).getAttribute("data-height") || null,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-mermaid-block": "",
        "data-code": node.attrs.code,
        "data-height": node.attrs.height ?? "",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },

  addStorage(): { markdown: MarkdownNodeSpec } {
    return {
      markdown: {
        serialize(state, node) {
          const meta = node.attrs.height ? ` height=${node.attrs.height}` : "";
          state.write("```mermaid" + meta + "\n");
          state.text(node.attrs.code, false);
          state.ensureNewLine();
          state.write("```");
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            const defaultFence =
              markdownit.renderer.rules.fence?.bind(markdownit.renderer.rules);
            markdownit.renderer.rules.fence = (
              tokens,
              idx,
              options,
              env,
              self,
            ) => {
              const token = tokens[idx];
              const info = String(token.info ?? "").trim();
              if (info === "mermaid" || info.startsWith("mermaid ")) {
                const height = /height=(\d+)/.exec(info)?.[1] ?? "";
                const code = markdownit.utils.escapeHtml(token.content);
                return `<div data-mermaid-block data-code="${code}" data-height="${height}"></div>`;
              }
              return defaultFence
                ? defaultFence(tokens, idx, options, env, self)
                : self.renderToken(tokens, idx, options);
            };
          },
        },
      },
    };
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
