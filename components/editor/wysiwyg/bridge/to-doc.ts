import type {
  BlockNode,
  ComponentNode,
  InlineNode,
  ListNode,
  TableCellNode,
} from "@tanstack/markdown";
import type { JSONContent } from "@tiptap/react";
import { splitTopLevelBlocks, type TopLevelBlock } from "@/lib/markdown/blocks";
import {
  CALLOUT_KINDS,
  HEADING_LEVELS,
  MARK_ORDER,
  MARKS,
  NODES,
  type CalloutKind,
} from "./schema-names";

// Pure on purpose (no DOM, editor instance or React): Vitest runs it in node,
// and the editor's paste handler reuses it.

/**
 * One top-level block as loaded: its exact source, the node the full-document
 * parse gave it, and whether it became a locked `rawBlock`. `synthetic` marks
 * the empty title heading inserted when a post doesn't start with `## `; it
 * has no source of its own (`source: ""`).
 */
export type LoadedBlock = {
  source: string;
  node: BlockNode;
  raw: boolean;
  synthetic?: true;
};

export type MarkdownDoc = {
  doc: JSONContent;
  /** `doc.content[i]` corresponds to `blocks[i]`. */
  blocks: LoadedBlock[];
  /** Link-reference / footnote definitions, verbatim; written back after the blocks. */
  definitions: string;
};

/** Load-time check that a block's JSON serializes back to the same AST. */
export type Fidelity = (block: TopLevelBlock, json: JSONContent) => boolean;

/** Thrown inside a block's mapping; the whole top-level block becomes raw. */
class Unmappable extends Error {}

type Mark = { type: string; attrs?: Record<string, unknown> };

const nullable = (value: string | undefined) => value ?? null;

function sameMarks(a: Mark[] | undefined, b: Mark[] | undefined): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

const rank = (mark: Mark) => MARK_ORDER.indexOf(mark.type as never);

/** Attaches marks in canonical (schema rank) order, one per type. */
function withMarks(node: JSONContent, marks: Mark[]): JSONContent {
  if (!marks.length) return node;
  const unique = marks.filter(
    (m, i) => marks.findIndex((n) => n.type === m.type) === i,
  );
  return { ...node, marks: unique.sort((a, b) => rank(a) - rank(b)) };
}

/** Appends inline content, merging adjacent text with equal marks (as ProseMirror does). */
function push(out: JSONContent[], node: JSONContent) {
  const last = out[out.length - 1];
  if (
    node.type === NODES.text &&
    last?.type === NODES.text &&
    sameMarks(last.marks as Mark[], node.marks as Mark[])
  ) {
    out[out.length - 1] = { ...last, text: (last.text ?? "") + node.text };
  } else {
    out.push(node);
  }
}

function mapInlines(nodes: InlineNode[], marks: Mark[] = []): JSONContent[] {
  const out: JSONContent[] = [];
  for (const node of nodes) {
    for (const item of mapInline(node, marks)) push(out, item);
  }
  return out;
}

function mapInline(node: InlineNode, marks: Mark[]): JSONContent[] {
  switch (node.type) {
    case "text":
      return node.value
        ? [withMarks({ type: NODES.text, text: node.value }, marks)]
        : [];
    case "inlineCode":
      // TipTap's code mark excludes every other mark, so code inside
      // bold/italic/strike/link can't be held faithfully.
      if (marks.length) throw new Unmappable("inline code inside another mark");
      return node.value
        ? [
            withMarks({ type: NODES.text, text: node.value }, [
              { type: MARKS.code },
            ]),
          ]
        : [];
    case "strong":
      return mapInlines(node.children, [...marks, { type: MARKS.bold }]);
    case "emphasis":
      return mapInlines(node.children, [...marks, { type: MARKS.italic }]);
    case "strike":
      return mapInlines(node.children, [...marks, { type: MARKS.strike }]);
    case "link":
      if (marks.some((m) => m.type === MARKS.link))
        throw new Unmappable("nested link");
      return mapInlines(node.children, [
        ...marks,
        {
          type: MARKS.link,
          attrs: { href: node.href, title: nullable(node.title) },
        },
      ]);
    case "image":
      return [
        withMarks(
          {
            type: NODES.image,
            attrs: { src: node.src, alt: node.alt, title: nullable(node.title) },
          },
          marks,
        ),
      ];
    case "break":
      return [withMarks({ type: NODES.hardBreak }, marks)];
    case "footnoteReference":
    case "inlineHtml":
    case "inlineComponent":
      throw new Unmappable(node.type);
    default:
      throw new Unmappable((node as { type: string }).type);
  }
}

function inlineParent(type: string, nodes: InlineNode[], attrs?: object) {
  const content = mapInlines(nodes);
  const json: JSONContent = { type };
  if (attrs) json.attrs = { ...attrs };
  if (content.length) json.content = content;
  return json;
}

function mapBlocks(nodes: BlockNode[]): JSONContent[] {
  return nodes.map(mapBlock);
}

function nonEmpty(nodes: BlockNode[], what: string): JSONContent[] {
  if (!nodes.length) throw new Unmappable(`empty ${what}`);
  return mapBlocks(nodes);
}

function mapList(node: ListNode): JSONContent {
  // TipTap has no loose (blank-line separated) lists or task items.
  if (node.loose) throw new Unmappable("loose list");
  const items = node.items.map((item): JSONContent => {
    if (item.checked !== undefined) throw new Unmappable("task list item");
    if (!item.children.length)
      return { type: NODES.listItem, content: [{ type: NODES.paragraph }] };
    // listItem content is "paragraph block*".
    if (item.children[0].type !== "paragraph")
      throw new Unmappable("list item not starting with a paragraph");
    return { type: NODES.listItem, content: mapBlocks(item.children) };
  });
  return node.ordered
    ? { type: NODES.orderedList, attrs: { start: node.start ?? 1 }, content: items }
    : { type: NODES.bulletList, content: items };
}

function mapCell(type: string, cell: TableCellNode): JSONContent {
  return { type, content: [inlineParent(NODES.paragraph, cell.children)] };
}

/** Properties a component may carry, and which of them are required. */
const EMBEDS: Record<
  string,
  { type: string; attrs: string[]; required: string[]; rename?: Record<string, string> }
> = {
  "md-apple-music": {
    type: NODES.appleMusicBlock,
    attrs: ["url", "title"],
    required: ["url"],
  },
  "md-youtube": { type: NODES.youtubeBlock, attrs: ["id", "title"], required: ["id"] },
  "md-envelope": { type: NODES.envelopeBlock, attrs: ["text"], required: ["text"] },
  "md-mermaid": {
    type: NODES.mermaidBlock,
    attrs: ["chart", "height"],
    required: ["chart"],
    rename: { chart: "code" },
  },
};

function mapComponent(node: ComponentNode): JSONContent {
  const props = node.properties ?? {};
  if (node.tagName === "md-callout") {
    // `type` is derived from `kind`; any other property (a custom `title`)
    // has no place in the editor.
    const kind = props.kind as CalloutKind;
    if (
      !CALLOUT_KINDS.includes(kind) ||
      Object.keys(props).some((k) => k !== "kind" && k !== "type")
    ) {
      throw new Unmappable("callout kind or title");
    }
    return {
      type: NODES.calloutBlock,
      attrs: { kind },
      content: nonEmpty(node.children, "callout"),
    };
  }
  const embed = node.tagName ? EMBEDS[node.tagName] : undefined;
  if (!embed) throw new Unmappable(`component ${node.tagName ?? node.name}`);
  const keys = Object.keys(props);
  if (
    node.children.length ||
    keys.some((k) => !embed.attrs.includes(k)) ||
    embed.required.some((k) => props[k] === undefined)
  ) {
    throw new Unmappable(`component ${node.tagName} attributes`);
  }
  const attrs = Object.fromEntries(
    embed.attrs.map((k) => [embed.rename?.[k] ?? k, nullable(props[k])]),
  );
  return { type: embed.type, attrs };
}

function mapBlock(node: BlockNode): JSONContent {
  switch (node.type) {
    case "heading":
      if (
        !(HEADING_LEVELS as readonly number[]).includes(node.depth) ||
        node.framework !== undefined
      ) {
        throw new Unmappable(`heading level ${node.depth}`);
      }
      return inlineParent(NODES.heading, node.children, { level: node.depth });
    case "paragraph":
      return inlineParent(NODES.paragraph, node.children);
    case "code": {
      // Only the language survives in the editor; any other fence info is lost.
      if (
        node.meta !== undefined ||
        node.title !== undefined ||
        node.file !== undefined ||
        node.framework !== undefined ||
        node.highlightLines?.length
      ) {
        throw new Unmappable("code fence meta");
      }
      const json: JSONContent = {
        type: NODES.codeBlock,
        attrs: { language: nullable(node.lang) },
      };
      if (node.value) json.content = [{ type: NODES.text, text: node.value }];
      return json;
    }
    case "list":
      return mapList(node);
    case "blockquote":
      return { type: NODES.blockquote, content: nonEmpty(node.children, "quote") };
    case "table":
      // Table cells have no alignment attr.
      if (node.align.some((a) => a !== undefined && a !== null))
        throw new Unmappable("aligned table");
      return {
        type: NODES.table,
        content: [
          {
            type: NODES.tableRow,
            content: node.header.map((c) => mapCell(NODES.tableHeader, c)),
          },
          ...node.rows.map((row) => ({
            type: NODES.tableRow,
            content: row.map((c) => mapCell(NODES.tableCell, c)),
          })),
        ],
      };
    case "thematicBreak":
      return { type: NODES.horizontalRule };
    case "component":
      return mapComponent(node);
    case "footnotes":
    case "html":
    case "callout":
      throw new Unmappable(node.type);
    default:
      throw new Unmappable((node as { type: string }).type);
  }
}

const rawBlock = (source: string): JSONContent => ({
  type: NODES.rawBlock,
  attrs: { source },
});

const isTitle = (json: JSONContent | undefined) =>
  json?.type === NODES.heading && json.attrs?.level === 2;

/**
 * Converts a post's Markdown into TipTap JSON for the editor. Each top-level
 * block maps to one top-level node; a block the editor can't hold exactly
 * (or that fails `fidelity`) becomes a locked `rawBlock` with its source.
 * The document always starts with a level-2 title heading: when the post
 * doesn't, an empty synthetic one is prepended.
 */
export function markdownToDoc(
  source: string,
  fidelity: Fidelity = () => true,
): MarkdownDoc {
  const { blocks: split, definitions } = splitTopLevelBlocks(source);
  const content: JSONContent[] = [];
  const blocks: LoadedBlock[] = [];

  for (const block of split) {
    let json: JSONContent | undefined;
    try {
      json = mapBlock(block.node);
    } catch (error) {
      if (!(error instanceof Unmappable)) throw error;
    }
    const raw = !json || !fidelity(block, json);
    content.push(raw ? rawBlock(block.source) : json!);
    blocks.push({ source: block.source, node: block.node, raw });
  }

  if (!isTitle(content[0])) {
    content.unshift({ type: NODES.heading, attrs: { level: 2 } });
    blocks.unshift({
      source: "",
      node: { type: "heading", depth: 2, children: [] },
      raw: false,
      synthetic: true,
    });
  }

  return { doc: { type: NODES.doc, content }, blocks, definitions };
}
