import type { JSONContent } from "@tiptap/react";
import { parseArticle } from "@/lib/markdown/config";
import { deepEqual } from "./bridge/deep-equal";
import { markdownToDoc, type LoadedBlock } from "./bridge/to-doc";
import {
  blockToMarkdown,
  docToMarkdown,
  UnserializableError,
  type DocToMarkdownOptions,
} from "./bridge/to-markdown";
import { MARK_ORDER, MARKS, NODES } from "./bridge/schema-names";

// Pure on purpose (no DOM, editor instance or React), like the bridge: the
// last check before a post is written. Nothing is saved unless it passes.

export type SaveCheck =
  | { ok: true; markdown: string }
  | {
      ok: false;
      reason: "lossy" | "unserializable";
      /** Index into `doc.content` of the first top-level block that differs. */
      blockIndex: number;
      /** That block's Markdown as loaded, or null (a new or synthetic block, or none). */
      loadedSource: string | null;
      /** That block's Markdown in the text being saved, or null (dropped, or never written). */
      savingSource: string | null;
      message: string;
    };

export type Serialize = (
  doc: JSONContent,
  definitions?: string,
  options?: DocToMarkdownOptions,
) => string;

export type CheckSaveArgs = {
  /** `markdownToDoc(source).blocks`, from load. */
  loaded: LoadedBlock[];
  /** The editor's top-level nodes captured at load (`getJSON().content`). */
  loadedDoc: JSONContent[];
  /** The editor's document now (`getJSON()`). */
  doc: JSONContent;
  /** `markdownToDoc(source).definitions`, written back verbatim. */
  definitions: string;
  /** Injected for fault-injection tests; defaults to docToMarkdown. */
  serialize?: Serialize;
};

const LOSSY =
  "Saving would change this block: what would be written doesn't read back as what is in the editor. Nothing was saved. Undo the last change, or fix it in Source mode.";
const LOSSY_UNCHANGED =
  "Saving would change this block although it wasn't edited. Nothing was saved. Fix it in Source mode.";

// ---------------------------------------------------------------- normalize
//
// Both sides of Check A are projected onto what the bridge and the
// serializer actually carry, so only real differences count:
// - attrs: only the contract attrs of schema-names.ts, absent -> null.
//   Equivalences the serializer itself makes: orderedList start null -> 1;
//   image alt null -> ""; image title, codeBlock language and mermaidBlock
//   height "" -> null (all written as nothing). Everything else (link
//   target/rel/class, image width/height, orderedList type, cell
//   colspan/rowspan/colwidth, unknown attrs) is dropped.
// - marks: link keeps { href, title }, other marks no attrs; sorted to
//   MARK_ORDER (unknown marks last, by name). hardBreak marks are dropped
//   (a break has no visible formatting).
// - inline content (paragraph, heading, table cell paragraph): empty text
//   dropped, adjacent text with equal marks merged (as ProseMirror and the
//   bridge do), trailing hard breaks dropped, and the blanks the parser
//   trims dropped: at the start/end of the content, around a newline inside
//   text, and at the start of a line after a hard break. Text in a code mark
//   is never trimmed.
// - block content (blockquote, callout, list item): blocks that write
//   nothing (empty paragraphs, empty raw blocks) dropped; a list item left
//   empty holds one empty paragraph, a table cell with no content one empty
//   paragraph.
// - codeBlock text runs are concatenated (never trimmed).

type Mark = { type: string; attrs?: Record<string, unknown> };

const CONTRACT: Record<string, string[]> = {
  [NODES.heading]: ["level"],
  [NODES.orderedList]: ["start"],
  [NODES.codeBlock]: ["language"],
  [NODES.image]: ["src", "alt", "title"],
  [NODES.mermaidBlock]: ["code", "height"],
  [NODES.envelopeBlock]: ["text"],
  [NODES.appleMusicBlock]: ["url", "title"],
  [NODES.youtubeBlock]: ["id", "title"],
  [NODES.calloutBlock]: ["kind"],
  [NODES.rawBlock]: ["source"],
};

const EMPTY_IS_NULL: Record<string, string[]> = {
  [NODES.image]: ["title"],
  [NODES.codeBlock]: ["language"],
  [NODES.mermaidBlock]: ["height"],
};

function projectAttrs(node: JSONContent): Record<string, unknown> | undefined {
  const keys = CONTRACT[node.type ?? ""];
  if (!keys) return undefined;
  const attrs = node.attrs ?? {};
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    let value = attrs[key] ?? null;
    if (value === "" && EMPTY_IS_NULL[node.type!]?.includes(key)) value = null;
    out[key] = value;
  }
  if (node.type === NODES.orderedList && out.start === null) out.start = 1;
  if (node.type === NODES.image && out.alt === null) out.alt = "";
  return out;
}

const markRank = (type: string) => {
  const i = MARK_ORDER.indexOf(type as never);
  return i === -1 ? MARK_ORDER.length : i;
};

function normMarks(marks: Mark[] | undefined): Mark[] | undefined {
  if (!marks?.length) return undefined;
  return marks
    .map((m): Mark =>
      m.type === MARKS.link
        ? { type: m.type, attrs: { href: m.attrs?.href ?? null, title: m.attrs?.title || null } }
        : { type: m.type },
    )
    .sort((a, b) => markRank(a.type) - markRank(b.type) || a.type.localeCompare(b.type));
}

const withMarks = (node: JSONContent, marks: Mark[] | undefined): JSONContent =>
  marks ? { ...node, marks } : node;

const isCode = (node: JSONContent) =>
  (node.marks ?? []).some((m) => m.type === MARKS.code);
const isPlainText = (node: JSONContent | undefined) =>
  node?.type === NODES.text && !isCode(node);
const sameMarks = (a: JSONContent, b: JSONContent) =>
  JSON.stringify(a.marks ?? []) === JSON.stringify(b.marks ?? []);

function mergeText(nodes: JSONContent[]): JSONContent[] {
  const out: JSONContent[] = [];
  for (const node of nodes) {
    if (node.type === NODES.text && !node.text) continue;
    const last = out[out.length - 1];
    if (node.type === NODES.text && last?.type === NODES.text && sameMarks(last, node)) {
      out[out.length - 1] = { ...last, text: (last.text ?? "") + node.text };
    } else out.push(node);
  }
  return out;
}

function normInline(content: JSONContent[] | undefined): JSONContent[] {
  let items = mergeText(
    (content ?? []).map((node): JSONContent => {
      switch (node.type) {
        case NODES.text:
          return withMarks({ type: NODES.text, text: node.text ?? "" }, normMarks(node.marks));
        case NODES.hardBreak:
          return { type: NODES.hardBreak };
        default:
          return withMarks(
            { type: node.type, ...(projectAttrs(node) ? { attrs: projectAttrs(node) } : {}) },
            normMarks(node.marks),
          );
      }
    }),
  );
  // Repeat until stable: trimming can expose a trailing break, and dropping
  // a break can bring two equal runs together.
  for (;;) {
    const before = JSON.stringify(items);
    while (items.length && items[items.length - 1].type === NODES.hardBreak) items.pop();
    items = items.map((node, i) => {
      if (!isPlainText(node)) return node;
      let t = (node.text ?? "").replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
      if (i === 0) t = t.replace(/^\s+/, "");
      if (i === items.length - 1) t = t.replace(/\s+$/, "");
      if (items[i - 1]?.type === NODES.hardBreak) t = t.replace(/^[ \t]+/, "");
      return { ...node, text: t };
    });
    items = mergeText(items);
    if (JSON.stringify(items) === before) return items;
  }
}

/** A block that writes nothing inside block content. */
const isEmptyBlock = (node: JSONContent) =>
  (node.type === NODES.paragraph && !node.content) ||
  (node.type === NODES.rawBlock && !node.attrs?.source);

const EMPTY_PARAGRAPH: JSONContent = { type: NODES.paragraph };

function normBlocks(content: JSONContent[] | undefined): JSONContent[] {
  return (content ?? []).map(normBlock).filter((n) => !isEmptyBlock(n));
}

/** The canonical form of a block; see the list above. */
function normBlock(node: JSONContent): JSONContent {
  const out: JSONContent = { type: node.type };
  const attrs = projectAttrs(node);
  if (attrs) out.attrs = attrs;
  let content: JSONContent[] | undefined;
  switch (node.type) {
    case NODES.paragraph:
    case NODES.heading:
      content = normInline(node.content);
      break;
    case NODES.codeBlock: {
      const text = (node.content ?? []).map((n) => n.text ?? "").join("");
      content = text ? [{ type: NODES.text, text }] : [];
      break;
    }
    case NODES.listItem:
      content = normBlocks(node.content);
      if (!content.length) content = [EMPTY_PARAGRAPH];
      break;
    case NODES.tableCell:
    case NODES.tableHeader:
      content = (node.content ?? []).map(normBlock);
      if (!content.length) content = [EMPTY_PARAGRAPH];
      break;
    case NODES.blockquote:
    case NODES.calloutBlock:
    case NODES.doc:
      content = normBlocks(node.content);
      break;
    default:
      content = node.content?.map(normBlock);
  }
  if (content?.length) out.content = content;
  return out;
}

const key = (node: JSONContent) => JSON.stringify(normBlock(node));

// ---------------------------------------------------------------- alignment

/**
 * Pairs each node of `doc` with the loaded node it still equals (longest
 * common subsequence of canonical forms), so unchanged blocks stay paired
 * across inserts and deletes. `exact[i]` is the loaded index doc[i] equals;
 * `near[i]` also pairs blocks edited in place (a gap of equal length on
 * both sides), for reporting only.
 */
function align(docKeys: string[], loadedKeys: string[]) {
  const n = docKeys.length;
  const m = loadedKeys.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] =
        docKeys[i] === loadedKeys[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const exact: (number | undefined)[] = new Array(n).fill(undefined);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (docKeys[i] === loadedKeys[j]) exact[i++] = j++;
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  const near = [...exact];
  let prevDoc = -1;
  let prevLoaded = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && exact[i] === undefined) continue;
    const nextLoaded = i < n ? exact[i]! : m;
    if (i - prevDoc === nextLoaded - prevLoaded)
      for (let k = prevDoc + 1; k < i; k++) near[k] = prevLoaded + (k - prevDoc);
    prevDoc = i;
    prevLoaded = nextLoaded;
  }
  return { exact, near };
}

// ---------------------------------------------------------------- check

const ownBlocks = (children: ReturnType<typeof parseArticle>["children"]) =>
  children.length > 1 && children[children.length - 1].type === "footnotes"
    ? children.slice(0, -1)
    : children;

function safeBlockToMarkdown(node: JSONContent): string | null {
  try {
    return blockToMarkdown(node);
  } catch (error) {
    if (error instanceof UnserializableError) return null;
    throw error;
  }
}

/**
 * A structured block and a rawBlock are the same content when the block's
 * Markdown is the raw source, or both parse to the same AST (an edit can
 * turn a structured block into one that reloads as raw, e.g. a list item
 * with two paragraphs is a loose list, or the other way round).
 */
function rawEquivalent(a: JSONContent, b: JSONContent, definitions: string): boolean {
  const aRaw = a.type === NODES.rawBlock;
  if (aRaw === (b.type === NODES.rawBlock)) return false;
  const [raw, structured] = aRaw ? [a, b] : [b, a];
  const source = String(raw.attrs?.source ?? "");
  const markdown = safeBlockToMarkdown(structured);
  if (markdown === null) return false;
  if (markdown === source) return true;
  const defs = definitions ? "\n\n" + definitions : "";
  return deepEqual(
    ownBlocks(parseArticle(markdown + defs).children),
    ownBlocks(parseArticle(source + defs).children),
  );
}

const isEmptyTitle = (node: JSONContent | undefined) =>
  node?.type === NODES.heading &&
  node.attrs?.level === 2 &&
  !(node.content ?? []).length;

/**
 * The last check before saving. Serializes `doc` and proves the result
 * loses nothing:
 * - Check A: the saved Markdown, loaded again, gives `doc` back, block by
 *   block (compared in canonical form, see above; a rawBlock equals a
 *   structured block with the same Markdown or AST).
 * - Check B: every block still equal to a block captured at load parses,
 *   in the saved text, to exactly the AST that block had at load (catches
 *   changes the editor's JSON can't show, e.g. a raw block read differently
 *   in its new context).
 * The first failing top-level block is reported; an UnserializableError
 * from the serializer is reported as "unserializable".
 */
export function checkSave({
  loaded,
  loadedDoc,
  doc,
  definitions,
  serialize = docToMarkdown,
}: CheckSaveArgs): SaveCheck {
  const content = doc.content ?? [];
  const syntheticTitle = loaded[0]?.synthetic === true;
  const docKeys = content.map(key);
  const { exact, near } = align(docKeys, loadedDoc.map(key));
  const sourceOf = (j: number | undefined) =>
    j === undefined || loaded[j]?.synthetic ? null : (loaded[j]?.source ?? null);
  const fail = (
    reason: "lossy" | "unserializable",
    blockIndex: number,
    savingSource: string | null,
    message: string,
  ): SaveCheck => ({
    ok: false,
    reason,
    blockIndex,
    loadedSource: sourceOf(near[blockIndex]),
    savingSource,
    message,
  });

  let markdown: string;
  try {
    markdown = serialize(doc, definitions, { syntheticTitle });
  } catch (error) {
    if (!(error instanceof UnserializableError)) throw error;
    let index = error.blockIndex;
    if (index === undefined) {
      index = content.findIndex((n) => safeBlockToMarkdown(n) === null);
      if (index === -1) index = Math.max(0, exact.findIndex((j) => j === undefined));
    }
    return fail("unserializable", index, null, error.message);
  }

  // The blocks the saved text should hold, with their doc index.
  const expected = content
    .map((node, index) => ({ node, index }))
    .filter(({ node, index }) =>
      index === 0 && syntheticTitle && isEmptyTitle(node)
        ? false
        : safeBlockToMarkdown(node) !== "",
    );
  const reloaded = markdownToDoc(markdown);
  const skip = reloaded.blocks[0]?.synthetic ? 1 : 0;
  const got = (reloaded.doc.content ?? []).slice(skip).map((node, k) => ({
    node,
    block: reloaded.blocks[k + skip],
  }));
  const same = (a: JSONContent, b: JSONContent) =>
    key(a) === key(b) || rawEquivalent(a, b, definitions);

  // Check A.
  for (let k = 0; k < Math.max(expected.length, got.length); k++) {
    const want = expected[k];
    const have = got[k];
    if (want && have && same(want.node, have.node)) continue;
    const dropped =
      !have ||
      (got.length < expected.length && !!expected[k + 1] && same(expected[k + 1].node, have.node));
    return fail(
      "lossy",
      want?.index ?? content.length,
      dropped ? null : have.block.source,
      LOSSY,
    );
  }

  // Check B.
  for (let k = 0; k < expected.length; k++) {
    const { index } = expected[k];
    const j = exact[index];
    if (j === undefined || loaded[j]?.synthetic) continue;
    if (!deepEqual(got[k].block.node, loaded[j].node))
      return fail("lossy", index, got[k].block.source, LOSSY_UNCHANGED);
  }

  return { ok: true, markdown };
}
