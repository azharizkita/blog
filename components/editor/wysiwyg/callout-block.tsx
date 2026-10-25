"use client";

import {
  Node,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  mergeAttributes,
  type NodeViewProps,
} from "@tiptap/react";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { CALLOUT_KINDS, type CalloutKind } from "./bridge/schema-names";

/**
 * The look of each kind, as the article's `Callout`
 * (components/article-content/article-components.tsx) draws it: GitHub's
 * five kinds fold into its three variants.
 */
const VARIANTS = {
  note: { icon: Info, iconClass: "text-accent-link" },
  tip: { icon: Lightbulb, iconClass: "text-primary" },
  warn: { icon: TriangleAlert, iconClass: "text-destructive" },
} as const;

const VARIANT_OF: Record<CalloutKind, keyof typeof VARIANTS> = {
  NOTE: "note",
  IMPORTANT: "note",
  TIP: "tip",
  WARNING: "warn",
  CAUTION: "warn",
};

const isKind = (value: unknown): value is CalloutKind =>
  (CALLOUT_KINDS as readonly unknown[]).includes(value);

/**
 * A GitHub-style callout (`> [!TIP]` and its quoted body). `kind` holds the
 * kind as written (NOTE | TIP | IMPORTANT | WARNING | CAUTION) so saving
 * writes it back unchanged; the node view's selector changes it.
 */
export const CalloutBlock = Node.create({
  name: "calloutBlock",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "NOTE",
        parseHTML: (element) => {
          const kind = element.getAttribute("data-kind");
          return isKind(kind) ? kind : "NOTE";
        },
        renderHTML: (attributes) => ({ "data-kind": attributes.kind }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "aside[data-callout-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-callout-block": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutBlockView);
  },
});

function CalloutBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const kind: CalloutKind = isKind(node.attrs.kind) ? node.attrs.kind : "NOTE";
  const variant = VARIANTS[VARIANT_OF[kind]];
  const Icon = variant.icon;
  return (
    <NodeViewWrapper
      as="aside"
      data-callout-block
      className="flex gap-3 rounded-md border bg-muted/40 px-4 py-3"
    >
      <span contentEditable={false} className="flex-none">
        <Icon aria-hidden className={cn("mt-0.5 block size-4", variant.iconClass)} />
      </span>
      <NodeViewContent className="callout-body min-w-0 flex-1" />
      <select
        aria-label="Callout kind"
        contentEditable={false}
        disabled={!editor.isEditable}
        className="prose-muted h-6 flex-none self-start rounded-md bg-transparent text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        value={kind}
        onChange={(event) => updateAttributes({ kind: event.target.value })}
      >
        {CALLOUT_KINDS.map((k) => (
          <option key={k} value={k}>
            {k.charAt(0) + k.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
    </NodeViewWrapper>
  );
}
