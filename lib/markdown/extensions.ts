import type {
  BlockNode,
  ComponentNode,
  MarkdownDocument,
  MarkdownExtension,
} from "@tanstack/markdown";
import { commentComponentsExtension } from "@tanstack/markdown/extensions/comment-components";
import { decodeAttribute } from "./attributes";

/** Comment component name -> emitted tag. */
export const ARTICLE_COMPONENTS = {
  "apple-music": "md-apple-music",
  youtube: "md-youtube",
  envelope: "md-envelope",
} as const;

const QUOTE = /^ {0,3}>/;
const CALLOUT_START = /^ {0,3}>\s*\[!\w+\]/;

/** Consecutive `>` lines form one blockquote; blank lines separate quotes. */
export function blockquoteBoundaryExtension(): MarkdownExtension {
  return {
    name: "blockquote-boundary",
    parseBlock(context) {
      const first = context.lines[context.index] ?? "";
      if (!QUOTE.test(first) || CALLOUT_START.test(first)) return undefined;
      const stripped: string[] = [];
      let cursor = context.index;
      while (cursor < context.lines.length) {
        const line = context.lines[cursor] ?? "";
        if (!QUOTE.test(line)) break;
        stripped.push(line.replace(/^ {0,3}> ?/, ""));
        cursor++;
      }
      context.consume(cursor - context.index);
      return {
        type: "blockquote",
        children: context.parseBlocks(stripped.join("\n")),
      };
    },
  };
}

function mapBlocks(
  blocks: BlockNode[],
  fn: (node: BlockNode) => BlockNode,
): BlockNode[] {
  return blocks.map((raw) => {
    const node = fn(raw);
    switch (node.type) {
      case "blockquote":
      case "component":
      case "callout":
        return { ...node, children: mapBlocks(node.children, fn) };
      case "list":
        return {
          ...node,
          items: node.items.map((i) => ({
            ...i,
            children: mapBlocks(i.children, fn),
          })),
        };
      default:
        return node;
    }
  });
}

function transformBlocks(
  document: MarkdownDocument,
  fn: (node: BlockNode) => BlockNode,
): MarkdownDocument {
  return { ...document, children: mapBlocks(document.children, fn) };
}

/** ```mermaid fences -> md-mermaid component nodes. */
export function mermaidExtension(): MarkdownExtension {
  return {
    name: "mermaid",
    transformDocument: (document) =>
      transformBlocks(document, (node) => {
        if (node.type !== "code" || node.lang !== "mermaid") return node;
        const height = /(?:^|\s)height=(\d+)(?:\s|$)/.exec(node.meta ?? "")?.[1];
        const properties: Record<string, string> = {
          chart: node.value,
          ...(height ? { height } : {}),
        };
        return {
          type: "component",
          name: "mermaid",
          tagName: "md-mermaid",
          attributes: properties,
          properties,
          children: [],
        } satisfies ComponentNode;
      }),
  };
}

export function articleComponentsExtension(): MarkdownExtension {
  return commentComponentsExtension({
    transformComponent(node) {
      const attributes = Object.fromEntries(
        Object.entries(node.attributes).map(([k, v]) => [k, decodeAttribute(v)]),
      );
      const tagName = (ARTICLE_COMPONENTS as Record<string, string>)[node.name];
      if (!tagName) {
        return {
          ...node,
          attributes,
          tagName: "md-unknown",
          properties: { name: node.name },
        };
      }
      return { ...node, attributes, tagName, properties: attributes };
    },
  });
}

const CALLOUT_TYPES: Record<string, "note" | "tip" | "warn"> = {
  NOTE: "note",
  IMPORTANT: "note",
  TIP: "tip",
  WARNING: "warn",
  CAUTION: "warn",
};

/** `callout` nodes -> md-callout component nodes. */
export function calloutComponentExtension(): MarkdownExtension {
  return {
    name: "callout-component",
    transformDocument: (document) =>
      transformBlocks(document, (node) => {
        if (node.type !== "callout") return node;
        const type = CALLOUT_TYPES[node.kind.toUpperCase()] ?? "note";
        return {
          type: "component",
          name: "callout",
          tagName: "md-callout",
          attributes: { type },
          properties: { type },
          children: node.children,
        } satisfies ComponentNode;
      }),
  };
}
