import type { JSONContent } from "@tiptap/react";
import { markdownToDoc } from "./bridge/to-doc";
import { NODES } from "./bridge/schema-names";

// Pure on purpose (no DOM, editor or React), like the bridge: the decision
// behind MarkdownPaste (extensions.ts), unit-tested in tests/editor/paste.test.ts.

/**
 * Where the paste lands. `inline`: a heading or a table cell, which hold one
 * line of inline content (the serializer refuses a hard break there, and a
 * cell holds exactly one paragraph). `block`: anywhere else.
 */
export type PasteTarget = "block" | "inline";

export type PastePlan =
  /** Leave the paste to ProseMirror's default (plain-text) handling. */
  | { kind: "default" }
  /** Insert this text as is, at the selection. */
  | { kind: "text"; text: string }
  /** Insert these blocks (a slice, open where they meet the cursor). */
  | { kind: "blocks"; content: JSONContent[] };

/** Line breaks as the article renders a soft break: one space. */
const oneLine = (text: string) => text.replace(/[ \t]*(?:\r?\n[ \t]*)+/g, " ");

/** Soft line breaks inside text become spaces (code blocks keep theirs). */
function softBreaksToSpaces(node: JSONContent): JSONContent {
  if (node.type === NODES.codeBlock) return node;
  if (node.type === NODES.text) return { ...node, text: oneLine(node.text ?? "") };
  return node.content ? { ...node, content: node.content.map(softBreaksToSpaces) } : node;
}

const TEXTBLOCKS: string[] = [NODES.paragraph, NODES.heading];
const CONTAINERS: string[] = [
  NODES.blockquote,
  NODES.calloutBlock,
  NODES.bulletList,
  NODES.orderedList,
  NODES.listItem,
  NODES.table,
  NODES.tableRow,
  NODES.tableHeader,
  NODES.tableCell,
];

/**
 * The blocks' inline content as one line: textblocks joined by a space,
 * hard breaks as spaces. Null when a block has no inline form (a code
 * block, an embed, a raw block, a rule).
 */
function flatten(blocks: JSONContent[]): JSONContent[] | null {
  const out: JSONContent[] = [];
  const add = (items: JSONContent[]) => {
    if (!items.length) return;
    if (out.length) out.push({ type: NODES.text, text: " " });
    out.push(...items);
  };
  const walk = (nodes: JSONContent[]): boolean =>
    nodes.every((node) => {
      if (TEXTBLOCKS.includes(node.type ?? "")) {
        add(
          (node.content ?? []).map((item) =>
            item.type === NODES.hardBreak ? { type: NODES.text, text: " " } : item,
          ),
        );
        return true;
      }
      if (CONTAINERS.includes(node.type ?? "")) return walk(node.content ?? []);
      return false;
    });
  if (!walk(blocks)) return null;
  // Adjacent text with equal marks is one text node (as ProseMirror keeps it).
  const merged: JSONContent[] = [];
  for (const node of out) {
    const last = merged[merged.length - 1];
    if (
      node.type === NODES.text &&
      last?.type === NODES.text &&
      JSON.stringify(last.marks ?? []) === JSON.stringify(node.marks ?? [])
    ) {
      merged[merged.length - 1] = { ...last, text: (last.text ?? "") + (node.text ?? "") };
    } else merged.push(node);
  }
  return merged;
}

/**
 * How to paste `text` (clipboard text/plain) at `target`:
 * - `plain` (Shift held, ⌘⇧V): no Markdown reading; one line in an inline
 *   target, a paragraph per line elsewhere (the caller also skips the paste
 *   rules, which would read `**x**` as bold).
 * - Text with link-reference or footnote definitions: Markdown reading would
 *   drop the definitions (a paste has nowhere to keep them), so it is pasted
 *   as plain text instead.
 * - Otherwise the blocks markdownToDoc reads (without its synthetic title),
 *   with soft line breaks as spaces; in an inline target, flattened to one
 *   paragraph of inline content, or the text on one line when a block has
 *   no inline form.
 */
export function planPaste(
  text: string,
  target: PasteTarget,
  plain = false,
): PastePlan {
  const source = text.replace(/\r\n?/g, "\n");
  const asText = (): PastePlan =>
    target === "inline" ? { kind: "text", text: oneLine(source.trim()) } : { kind: "default" };
  if (!source.trim()) return { kind: "default" };
  if (plain) {
    if (target === "inline") return asText();
    // Each line a paragraph, as ProseMirror's own plain-text paste does.
    return {
      kind: "blocks",
      content: source
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => ({ type: NODES.paragraph, content: [{ type: NODES.text, text: line }] })),
    };
  }

  const { doc, blocks, definitions } = markdownToDoc(source);
  if (definitions) return asText();
  const content = (doc.content ?? [])
    .slice(blocks[0]?.synthetic ? 1 : 0)
    .map(softBreaksToSpaces);
  if (!content.length) return asText();
  if (target === "block") return { kind: "blocks", content };

  const inline = flatten(content);
  if (!inline) return asText();
  if (!inline.length) return { kind: "default" };
  return { kind: "blocks", content: [{ type: NODES.paragraph, content: inline }] };
}
