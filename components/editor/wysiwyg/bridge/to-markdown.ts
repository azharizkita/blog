import { parseInline } from "@tanstack/markdown";
import type { JSONContent } from "@tiptap/react";
import { encodeAttribute } from "@/lib/markdown/attributes";
import {
  DESTINATION,
  FOOTNOTE,
  REFERENCE,
  splitTopLevelBlocks,
} from "@/lib/markdown/blocks";
import { parseOptions } from "@/lib/markdown/config";
import { deepEqual } from "./deep-equal";
import { CALLOUT_KINDS, MARK_ORDER, MARKS, NODES } from "./schema-names";

// Pure on purpose (no DOM, editor instance or React), like ./to-doc.ts, whose
// exact inverse this is: markdownToDoc(docToMarkdown(doc)) gives `doc` back
// for every shape the bridge produces. The parser rules this escapes against
// are @tanstack/markdown's own (dist/parser.js, dist/inline.js), which differ
// from CommonMark in places; see the comments below.

/** A document shape that has no Markdown form; saving must stop, not drop it. */
export class UnserializableError extends Error {
  /** The top-level block (index into `doc.content`) it comes from, when known. */
  blockIndex?: number;

  constructor(message: string, blockIndex?: number) {
    super(message);
    this.name = "UnserializableError";
    this.blockIndex = blockIndex;
  }
}

const TABLE_SHAPE =
  "This table can't be saved as Markdown: a cell has more than one paragraph, or the header/body shape doesn't match. Undo the change, or fix it in Source mode.";
const TABLE_BREAK =
  "A line break inside a table cell can't be saved as Markdown. Remove it, or fix it in Source mode.";
const HEADING_BREAK =
  "A line break inside a heading can't be saved as Markdown. Remove it, or fix it in Source mode.";

type Mark = { type: string; attrs?: Record<string, unknown> };

/** Where inline content is written; each place has its own hazards. */
type InlineContext = "block" | "heading" | "cell";

// ---------------------------------------------------------------- inline

const ALNUM = /[\p{L}\p{N}]/u;

/**
 * Escapes text so the inline parser reads it back as the same characters.
 * Always: `\` `` ` `` `*` `~` `[` `]` (every one opens or closes something;
 * a single `~` is strikethrough in this parser). `_` only when it could be a
 * delimiter, i.e. not flanked by letters/digits on both sides.
 */
function escapeInline(value: string): string {
  return value
    .replace(/[\\`*~[\]]/g, "\\$&")
    .replace(/_+/g, (run, at: number) =>
      ALNUM.test(value[at - 1] ?? "") && ALNUM.test(value[at + run.length] ?? "")
        ? run
        : run.replaceAll("_", "\\_"),
    );
}

/**
 * At the start of a line, characters that would open a block (heading,
 * quote, list, rule, table delimiter row, comment component) are escaped.
 * The parser trims each paragraph line, so the check is on the first
 * non-blank character, and leading blanks are dropped (they never survive).
 */
function escapeLineStart(escaped: string): string {
  const line = escaped.replace(/^[ \t]+/, "");
  if (/^[#>+\-<|:]/.test(line)) return "\\" + line;
  return line.replace(/^(\d{1,9})([.)])/, "$1\\$2");
}

/** A code span sized to its content: a backtick run length not used inside it. */
function codeSpan(value: string, context: InlineContext): string {
  if (value.includes("\n")) {
    throw new UnserializableError(
      context === "cell" ? TABLE_BREAK : "Inline code can't contain a line break.",
    );
  }
  // The closing run must be exactly as long as the opening one, so any
  // length not used inside works; the shortest keeps it off the
  // three-backtick fence form at a line start.
  const runs = new Set((value.match(/`+/g) ?? []).map((r) => r.length));
  let size = 1;
  while (runs.has(size)) size++;
  const fence = "`".repeat(size);
  // The parser strips one space at each end when both ends have one, unless
  // the span is all spaces; pad so that strip gives the value back.
  const pad =
    /^`|`$/.test(value) || (/^ .* $/.test(value) && /[^ ]/.test(value)) ? " " : "";
  return fence + pad + value + pad + fence;
}

/**
 * A link/image destination. The parser strips whitespace from it and its
 * bare form can't hold `<` or `>`, so those are percent-encoded (the same
 * URL); `\`, `(` and `)` are backslash-escaped (the parser unescapes them).
 */
// Ruling R14: percent-encoding whitespace (and `<`/`>`) in link and image
// URLs is accepted normalization; it is the same URL.
const encodeUrl = (href: string) =>
  href.replace(/[\s<>]/g, (c) => encodeURIComponent(c));

// The parser blanks any other scheme (sanitizeUrl, dist/utils.js).
const UNSAFE_URL = /^(?!https?:|mailto:|tel:)[a-z][a-z0-9+.-]*:/i;

function destination(href: string, title: unknown): string {
  if (UNSAFE_URL.test(href.replace(/[\u0000-\u001F\u007F\s]+/g, ""))) {
    throw new UnserializableError(
      `The link address ${JSON.stringify(href)} can't be saved: only http(s), mailto, tel and relative links are kept.`,
    );
  }
  const url = encodeUrl(href).replace(/[\\()]/g, "\\$&");
  if (typeof title !== "string" || title === "") return url;
  // Titles are not unescaped by the parser: pick a delimiter they don't
  // contain. Parentheses must stay balanced (the link's `(...)` is matched
  // by depth), and a title can't hold a line break.
  const balanced = (() => {
    let depth = 0;
    for (const c of title) {
      if (c === "(") depth++;
      if (c === ")" && --depth < 0) return false;
    }
    return depth === 0;
  })();
  if (!balanced || title.includes("\n")) {
    throw new UnserializableError(
      `This link or image title can't be saved as Markdown: ${JSON.stringify(title)}.`,
    );
  }
  if (!title.includes('"')) return `${url} "${title}"`;
  if (!title.includes("'")) return `${url} '${title}'`;
  if (!/[()]/.test(title)) return `${url} (${title})`;
  throw new UnserializableError(
    `This link or image title can't be saved as Markdown: ${JSON.stringify(title)}.`,
  );
}

const DELIMITED: readonly string[] = [MARKS.bold, MARKS.italic, MARKS.strike, MARKS.link];

function delimitedMarks(node: JSONContent): Mark[] {
  const marks = (node.marks ?? []) as Mark[];
  for (const mark of marks) {
    if (!(MARK_ORDER as readonly string[]).includes(mark.type)) {
      throw new UnserializableError(`The "${mark.type}" format can't be saved as Markdown.`);
    }
  }
  return marks
    .filter((m) => DELIMITED.includes(m.type))
    .sort((a, b) => MARK_ORDER.indexOf(a.type as never) - MARK_ORDER.indexOf(b.type as never));
}

const sameMark = (a: Mark, b: Mark) =>
  a.type === b.type &&
  (a.type !== MARKS.link ||
    (a.attrs?.href === b.attrs?.href && (a.attrs?.title ?? null) === (b.attrs?.title ?? null)));

type AstNode = { type: string; [key: string]: unknown };
type Italic = "smart" | "*" | "_";
type Open = { mark: Mark; delimiter: string; node: AstNode & { children: AstNode[] } };

const AST_TYPE: Record<string, string> = {
  [MARKS.bold]: "strong",
  [MARKS.italic]: "emphasis",
  [MARKS.strike]: "strike",
  [MARKS.link]: "link",
};

const atLineStart = (out: string) => /(?:^|\n)[ \t]*$/.test(out);

/**
 * One rendering of inline content, plus the AST it is meant to parse to.
 * Marks are written as nested delimiters: a mark stays open across adjacent
 * nodes that share it, and among the marks opening at one node the
 * longest-running one opens outermost (ties in MARK_ORDER, so equal ranges
 * nest link > bold > italic > strike, as `**_x_**`).
 *
 * `italic` picks the emphasis delimiter. This parser closes `**` at the
 * first `**` it meets and reads an opening `***` as emphasis around strong,
 * so an italic `*` next to a bold `**` breaks; "smart" uses `_` there.
 */
function renderInline(
  items: JSONContent[],
  marksOf: Mark[][],
  context: InlineContext,
  italic: Italic,
  segmented = false,
): { markdown: string; ast: AstNode[] } {
  let out = "";
  const root: AstNode[] = [];
  const stack: Open[] = [];

  const append = (node: AstNode) => {
    const siblings = stack.length ? stack[stack.length - 1].node.children : root;
    const last = siblings[siblings.length - 1];
    if (node.type === "text" && last?.type === "text") {
      siblings[siblings.length - 1] = { ...last, value: `${last.value}${node.value}` };
    } else siblings.push(node);
  };
  const closeTo = (depth: number) => {
    while (stack.length > depth) {
      const { mark, delimiter } = stack.pop()!;
      out +=
        mark.type === MARKS.link
          ? `](${destination(String(mark.attrs?.href ?? ""), mark.attrs?.title)})`
          : delimiter;
    }
  };
  const runEnd = (mark: Mark, from: number) => {
    let n = from;
    while (n < items.length && marksOf[n].some((m) => sameMark(m, mark))) n++;
    return n;
  };

  items.forEach((node, i) => {
    const marks = marksOf[i];
    let keep = 0;
    while (keep < stack.length && marks.some((m) => sameMark(m, stack[keep].mark))) keep++;
    closeTo(keep);

    // Content first: a text node that is empty once its line-start blanks
    // are dropped writes nothing (no empty `****`, which is a rule).
    let content: string;
    let ast: AstNode;
    const lineStart = context === "block" && atLineStart(out);
    switch (node.type) {
      case NODES.text: {
        const value = node.text ?? "";
        if ((node.marks ?? []).some((m) => m.type === MARKS.code)) {
          content = codeSpan(value, context);
          ast = { type: "inlineCode", value };
          break;
        }
        if (value.includes("\n") && context !== "block") {
          throw new UnserializableError(context === "cell" ? TABLE_BREAK : HEADING_BREAK);
        }
        // The parser trims each paragraph line, so line-start blanks go.
        const parts = value.split("\n");
        const lines = parts.map((line, n) => {
          const start = n > 0 || lineStart ? line.replace(/^[ \t]+/, "") : line;
          return n < parts.length - 1 ? start.replace(/[ \t]+$/, "") : start;
        });
        content = lines
          .map(escapeInline)
          .map((line, n) => (n > 0 || lineStart ? escapeLineStart(line) : line))
          .join("\n");
        ast = { type: "text", value: lines.join("\n") };
        break;
      }
      case NODES.image: {
        const attrs = node.attrs ?? {};
        const alt = String(attrs.alt ?? "");
        const src = String(attrs.src ?? "");
        content = `![${escapeInline(alt)}](${destination(src, attrs.title)})`;
        ast = {
          type: "image",
          src: encodeUrl(src), // R14: accepted URL normalization

          alt,
          ...(attrs.title ? { title: attrs.title } : {}),
        };
        break;
      }
      case NODES.hardBreak:
        if (context === "cell") throw new UnserializableError(TABLE_BREAK);
        if (context === "heading") throw new UnserializableError(HEADING_BREAK);
        content = "\\\n";
        ast = { type: "break" };
        break;
      default:
        throw new UnserializableError(`The "${node.type}" element can't be saved as Markdown.`);
    }
    if (content === "") return;

    const opening = marks
      .filter((m) => !stack.some((s) => sameMark(s.mark, m)))
      .map((mark) => ({ mark, end: runEnd(mark, i) }))
      .sort((a, b) => b.end - a.end);
    opening.forEach(({ mark, end }, k) => {
      let delimiter: string;
      switch (mark.type) {
        case MARKS.bold:
          delimiter = "**";
          break;
        case MARKS.strike:
          delimiter = "~~";
          break;
        case MARKS.italic: {
          const nextBold = opening[k + 1]?.mark.type === MARKS.bold;
          const boldEndsWithIt = stack.some(
            (s) => s.mark.type === MARKS.bold && runEnd(s.mark, i) === end,
          );
          delimiter =
            italic !== "smart"
              ? italic
              : out.endsWith("*") || nextBold || boldEndsWithIt
                ? "_"
                : "*";
          break;
        }
        default:
          delimiter = "[";
          // `![` is an image: a `!` right before a link opener is escaped.
          if (out.endsWith("!")) out = out.slice(0, -1) + "\\!";
      }
      out += delimiter;
      const astNode: Open["node"] = { type: AST_TYPE[mark.type], children: [] };
      if (mark.type === MARKS.link) {
        astNode.href = encodeUrl(String(mark.attrs?.href ?? "")); // R14
        if (mark.attrs?.title) astNode.title = mark.attrs.title;
      }
      append(astNode);
      stack.push({ mark, delimiter, node: astNode });
    });
    out += content;
    append(ast);
    if (segmented) closeTo(0);
  });
  closeTo(0);
  return { markdown: out, ast: root };
}

const FENCE_START = /^[ \t]*(?:`{3,}|~{3,})/;
// The parser lifts these lines out of the document before parsing blocks
// (extractDefinitions, dist/parser.js), ignoring backslash escapes.
// The patterns come from lib/markdown/blocks.ts, which mirrors the parser.
const isDefinition = (line: string) => {
  const reference = REFERENCE.exec(line);
  return FOOTNOTE.test(line) || (!!reference && DESTINATION.test(reference[2].trimEnd()));
};

/**
 * Lines of paragraph text that the block parser would take for something
 * else, which no escape can prevent: a code span using 3+ backticks at a
 * line start (a fence), and link text containing `]:` at a line start (a
 * link-reference definition).
 */
function checkLines(markdown: string, context: InlineContext): string {
  if (context !== "block") return markdown;
  for (const line of markdown.split("\n")) {
    if (FENCE_START.test(line) || isDefinition(line)) {
      throw new UnserializableError(
        `This line can't be saved as Markdown exactly: ${JSON.stringify(line)}. Add text before it at the start of the line, or fix it in Source mode.`,
      );
    }
  }
  return markdown;
}

const ITALICS: readonly Italic[] = ["smart", "*", "_"];

/**
 * Inline AST as runs of (content, mark set), merging adjacent text with equal
 * marks: what the editor holds, whatever the delimiter nesting.
 */
function flatten(nodes: AstNode[], marks = "", out: string[] = []): string[] {
  for (const node of nodes) {
    const { children, ...rest } = node as AstNode & { children?: AstNode[] };
    if (children) {
      const own = node.type === "link" ? `link:${rest.href}:${rest.title ?? ""}` : node.type;
      flatten(children, [...marks.split("|").filter(Boolean), own].sort().join("|"), out);
      continue;
    }
    const key = node.type === "text" ? `text@${marks}` : "";
    const last = out[out.length - 1];
    if (key && last?.startsWith(key + "=")) out[out.length - 1] = last + String(rest.value);
    else out.push(key ? `${key}=${String(rest.value)}` : JSON.stringify([rest, marks]));
  }
  return out;
}

/**
 * Inline content -> Markdown, verified: each candidate rendering is parsed
 * back and must give exactly the intended AST, else the next is tried. Last
 * come segmented renderings (every node closes its own marks, so intraword
 * bold+italic has a form); they must give the same runs (the same editor
 * content) rather than the same nesting. When none does, the formatting has
 * no Markdown form here and saving stops.
 */
function inlineToMarkdown(nodes: JSONContent[] = [], context: InlineContext): string {
  // A trailing hard break has no Markdown form (a lone `\` at the end of a
  // paragraph is a literal backslash) and nothing visible to keep.
  let end = nodes.length;
  while (end > 0 && nodes[end - 1].type === NODES.hardBreak) end--;
  // Adjacent text with equal marks is one run (ProseMirror merges them too;
  // two code spans in a row would read back as one span with backticks).
  const items: JSONContent[] = [];
  for (const node of nodes.slice(0, end)) {
    const last = items[items.length - 1];
    if (
      node.type === NODES.text &&
      last?.type === NODES.text &&
      JSON.stringify(last.marks ?? []) === JSON.stringify(node.marks ?? [])
    ) {
      items[items.length - 1] = { ...last, text: (last.text ?? "") + (node.text ?? "") };
    } else items.push(node);
  }
  // The parser trims each line, so blanks at either end are never kept.
  const isPlain = (node?: JSONContent) =>
    node?.type === NODES.text && !(node.marks ?? []).some((m) => m.type === MARKS.code);
  const trimEdge = (index: number, trim: (t: string) => string) => {
    if (!isPlain(items[index])) return false;
    const text = trim(items[index].text ?? "");
    if (text) items[index] = { ...items[index], text };
    else items.splice(index, 1);
    return !text;
  };
  // Trimming a blank-only run can expose a trailing hard break; drop it too.
  for (;;) {
    if (items[items.length - 1]?.type === NODES.hardBreak) items.pop();
    else if (!items.length || !trimEdge(items.length - 1, (t) => t.replace(/\s+$/, ""))) break;
  }
  while (items.length && trimEdge(0, (t) => t.replace(/^\s+/, "")));
  const marksOf = items.map(delimitedMarks);
  const italics = marksOf.some((m) => m.some((x) => x.type === MARKS.italic))
    ? ITALICS
    : ITALICS.slice(0, 1);
  for (const italic of italics) {
    const { markdown, ast } = renderInline(items, marksOf, context, italic);
    if (deepEqual(parseInline(markdown, parseOptions), ast))
      return checkLines(markdown, context);
  }
  for (const italic of italics) {
    const { markdown, ast } = renderInline(items, marksOf, context, italic, true);
    if (deepEqual(flatten(parseInline(markdown, parseOptions) as AstNode[]), flatten(ast)))
      return checkLines(markdown, context);
  }
  throw new UnserializableError(
    "This text's formatting can't be saved as Markdown exactly. Simplify the bold/italic/strikethrough/link around it, or fix it in Source mode.",
  );
}

// ---------------------------------------------------------------- blocks

const indent = (text: string, prefix: string, first = prefix) =>
  text
    .split("\n")
    .map((line, i) => (line === "" ? "" : (i === 0 ? first : prefix) + line))
    .join("\n");

const quote = (text: string) =>
  text
    .split("\n")
    .map((line) => (line === "" ? ">" : "> " + line))
    .join("\n");

function fence(info: string, value: string): string {
  const longest = Math.max(0, ...(value.match(/`+/g) ?? []).map((r) => r.length));
  const ticks = "`".repeat(Math.max(3, longest + 1));
  return `${ticks}${info}\n${value}${value === "" ? "" : "\n"}${ticks}`;
}

function component(name: string, attrs: Record<string, unknown>, keys: string[]): string {
  const parts = keys
    .filter((k) => attrs[k] !== null && attrs[k] !== undefined)
    .map((k) => ` ${k}="${encodeAttribute(String(attrs[k]))}"`);
  return `<!-- ::${name}${parts.join("")} -->`;
}

/** Text of a node's text children (code blocks). */
const plain = (node: JSONContent) => (node.content ?? []).map((n) => n.text ?? "").join("");

function cellToMarkdown(cell: JSONContent): string {
  const blocks = cell.content ?? [];
  if (blocks.length > 1 || (blocks[0] && blocks[0].type !== NODES.paragraph)) {
    throw new UnserializableError(TABLE_SHAPE);
  }
  const inline = inlineToMarkdown(blocks[0]?.content, "cell")
    // splitTableRow turns `\|` into `|` before inline parsing, everywhere in
    // the row (code spans too), so every pipe is written as `\|`.
    .replaceAll("|", "\\|");
  // A row whose cells all look like `---`/`:-:` would be read as a
  // delimiter row (with the row above as a header).
  return /^[-:]/.test(inline) ? "\\" + inline : inline;
}

const ALIGN: Record<string, string> = { left: ":---", center: ":---:", right: "---:" };

function tableToMarkdown(node: JSONContent): string {
  const rows = (node.content ?? []).map((row) => (row.content ?? []).map((c) => c));
  if (!rows.length || !rows[0].length) throw new UnserializableError(TABLE_SHAPE);
  // GFM has exactly one header row, on top; every row has the header's width.
  const columns = rows[0].length;
  if (
    rows.some((r) => r.length !== columns) ||
    rows.some((r, i) =>
      r.some((c) => c.type !== (i === 0 ? NODES.tableHeader : NODES.tableCell)),
    )
  ) {
    throw new UnserializableError(TABLE_SHAPE);
  }
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [
    line(rows[0].map(cellToMarkdown)),
    line(rows[0].map((c) => ALIGN[String(c.attrs?.align)] ?? "---")),
    ...rows.slice(1).map((r) => line(r.map(cellToMarkdown))),
  ].join("\n");
}

/**
 * Blocks whose first line ends a paragraph that comes before them (the
 * parser's isBlockStart), so inside a list item they can follow the previous
 * block on the next line without making the list loose.
 */
function interruptsParagraph(node: JSONContent): boolean {
  switch (node.type) {
    case NODES.heading:
    case NODES.codeBlock:
    case NODES.mermaidBlock:
    case NODES.blockquote:
    case NODES.calloutBlock:
    case NODES.horizontalRule:
    case NODES.table:
    case NODES.bulletList:
      return true;
    case NODES.orderedList:
      return (node.attrs?.start ?? 1) === 1;
    default:
      return false;
  }
}

/** Blocks a following paragraph line can't continue. */
const SELF_CLOSING: readonly string[] = [
  NODES.heading,
  NODES.codeBlock,
  NODES.mermaidBlock,
  NODES.blockquote,
  NODES.calloutBlock,
  NODES.horizontalRule,
  NODES.envelopeBlock,
  NODES.appleMusicBlock,
  NODES.youtubeBlock,
];

type Markers = { bullet: string; ordered: string };
type ListKind = "bullet" | "ordered";

const BULLETS = ["-", "*", "+"] as const;
const DELIMITERS = [".", ")"] as const;
// The parser's listMarker (dist/parser.js), at the start of a block.
const LIST_START = /^\s{0,8}([-+*]|\d{1,9}([.)]))(?:[ \t]|$)/;

/**
 * A block's list kind, and for a rawBlock that is a list, the marker it
 * uses (fixed: its source is written verbatim). Two neighbouring lists of
 * one kind and marker would be read as one list.
 */
function listBoundary(node: JSONContent): { kind: ListKind; marker?: string } | undefined {
  if (node.type === NODES.bulletList) return { kind: "bullet" };
  if (node.type === NODES.orderedList) return { kind: "ordered" };
  if (node.type !== NODES.rawBlock) return undefined;
  const match = LIST_START.exec(String(node.attrs?.source ?? ""));
  if (!match) return undefined;
  return match[2]
    ? { kind: "ordered", marker: match[2] }
    : { kind: "bullet", marker: match[1] };
}

type Laid = { node: JSONContent; index: number; text: string };

/**
 * Sibling blocks, each with its Markdown. Adjacent lists of one kind get
 * different markers (`-`/`*`/`+`, `.`/`)`), also against a raw list next to
 * them, so they stay separate lists. Empty paragraphs write nothing.
 */
function layoutBlocks(nodes: JSONContent[], offset = 0, top = false): Laid[] {
  // At the top level, errors carry the index of the block they come from.
  const tagged = <T>(index: number, run: () => T): T => {
    try {
      return run();
    } catch (error) {
      if (top && error instanceof UnserializableError && error.blockIndex === undefined)
        error.blockIndex = index;
      throw error;
    }
  };
  const entries = nodes
    .map((node, i) => ({
      node,
      index: i + offset,
      boundary: listBoundary(node),
      text:
        node.type === NODES.bulletList || node.type === NODES.orderedList
          ? undefined
          : tagged(i + offset, () => serializeBlock(node)),
    }))
    .filter((e) => e.text !== "");
  const chosen: (string | undefined)[] = entries.map((e) => e.boundary?.marker);
  entries.forEach((entry, i) => {
    if (entry.text !== undefined || !entry.boundary) return;
    const kind = entry.boundary.kind;
    const avoid = [i - 1, i + 1]
      .filter((j) => entries[j]?.boundary?.kind === kind)
      .map((j) => chosen[j]);
    const options = kind === "bullet" ? BULLETS : DELIMITERS;
    const marker = options.find((m) => !avoid.includes(m));
    if (!marker) {
      throw new UnserializableError(
        `The list at block ${entry.index + 1} can't be saved as Markdown: it would merge with the lists next to it. Add a paragraph between them, or fix it in Source mode.`,
        top ? entry.index : undefined,
      );
    }
    chosen[i] = marker;
    const markers: Markers = { bullet: "-", ordered: "." };
    if (kind === "bullet") markers.bullet = marker;
    else markers.ordered = marker;
    entry.text = tagged(entry.index, () => listToMarkdown(entry.node, markers));
  });
  return entries
    .filter((e) => e.text !== "")
    .map((e) => ({ node: e.node, index: e.index, text: e.text! }));
}

/**
 * Joins laid-out blocks. `tight` joins with a single newline where the
 * parser allows it (list items), otherwise blocks are separated by a blank
 * line.
 */
function joinBlocks(laid: Laid[], tight = false): string {
  return laid
    .map(({ node, text }, i) => {
      if (i === 0) return text;
      const prev = laid[i - 1].node;
      const single =
        tight &&
        (interruptsParagraph(node) ||
          (node.type === NODES.paragraph && SELF_CLOSING.includes(prev.type ?? "")));
      return (single ? "\n" : "\n\n") + text;
    })
    .join("");
}

const blocksToMarkdown = (nodes: JSONContent[] = [], tight = false) =>
  joinBlocks(layoutBlocks(nodes), tight);

function listToMarkdown(node: JSONContent, markers: Markers): string {
  const ordered = node.type === NODES.orderedList;
  const start = Number(node.attrs?.start ?? 1);
  const count = (node.content ?? []).length;
  // The parser reads at most 9 digits as a list number.
  if (ordered && (!Number.isInteger(start) || start < 0 || start + count - 1 > 999_999_999)) {
    throw new UnserializableError(
      `A numbered list from ${start} can't be saved as Markdown: list numbers have at most 9 digits.`,
    );
  }
  return (node.content ?? [])
    .map((item, i) => {
      const marker = ordered ? `${start + i}${markers.ordered}` : markers.bullet;
      const body = blocksToMarkdown(item.content, true);
      if (body === "") return marker;
      const pad = " ".repeat(marker.length + 1);
      return indent(body, pad, marker + " ");
    })
    .join("\n");
}

function headingToMarkdown(node: JSONContent): string {
  const level = Number(node.attrs?.level);
  if (!Number.isInteger(level) || level < 1 || level > 6) {
    throw new UnserializableError(`Heading level ${level} can't be saved as Markdown.`);
  }
  // A trailing run of `#` after a blank (or the whole text) is a closing
  // sequence the parser strips.
  const text = inlineToMarkdown(node.content, "heading").replace(/(^|[ \t])(#+[ \t]*)$/, "$1\\$2");
  return "#".repeat(level) + (text ? " " + text : "");
}

function serializeBlock(
  node: JSONContent,
  markers: Markers = { bullet: "-", ordered: "." },
): string {
  const attrs = node.attrs ?? {};
  switch (node.type) {
    case NODES.paragraph:
      return inlineToMarkdown(node.content, "block");
    case NODES.heading:
      return headingToMarkdown(node);
    case NODES.bulletList:
    case NODES.orderedList:
      return listToMarkdown(node, markers);
    case NODES.blockquote:
      return quote(blocksToMarkdown(node.content));
    case NODES.calloutBlock: {
      if (!(CALLOUT_KINDS as readonly unknown[]).includes(attrs.kind)) {
        throw new UnserializableError(`Callout kind "${attrs.kind}" can't be saved as Markdown.`);
      }
      const body = blocksToMarkdown(node.content);
      return `> [!${String(attrs.kind)}]` + (body ? "\n" + quote(body) : "");
    }
    case NODES.codeBlock: {
      // Anything past the parser's language pattern would become fence meta.
      const language = attrs.language ? String(attrs.language) : "";
      if (language === "mermaid") {
        throw new UnserializableError(
          "A code block in the mermaid language would be saved as a diagram. Use the diagram block instead, or pick another language.",
        );
      }
      if (language && !/^[A-Za-z0-9_+.#-]+$/.test(language)) {
        throw new UnserializableError(`Code language "${language}" can't be saved as Markdown.`);
      }
      return fence(language, plain(node));
    }
    case NODES.mermaidBlock: {
      const height = attrs.height;
      if (height !== null && height !== undefined && !/^\d+$/.test(String(height))) {
        throw new UnserializableError(`Diagram height "${height}" can't be saved as Markdown.`);
      }
      const info = "mermaid" + (height ? ` height=${height}` : "");
      return fence(info, String(attrs.code ?? ""));
    }
    case NODES.horizontalRule:
      return "---";
    case NODES.table:
      return tableToMarkdown(node);
    case NODES.envelopeBlock:
      return component("envelope", attrs, ["text"]);
    case NODES.appleMusicBlock:
      return component("apple-music", attrs, ["url", "title"]);
    case NODES.youtubeBlock:
      return component("youtube", attrs, ["id", "title"]);
    case NODES.rawBlock:
      return String(attrs.source ?? "");
    default:
      throw new UnserializableError(`The "${node.type}" block can't be saved as Markdown.`);
  }
}

/** One block's Markdown, as it is written inside a document. */
export function blockToMarkdown(node: JSONContent): string {
  return serializeBlock(node);
}

/** An empty `##` heading (no content at all; NBSP or spaces count as content). */
const isEmptyTitle = (node: JSONContent | undefined) =>
  node?.type === NODES.heading &&
  node.attrs?.level === 2 &&
  !(node.content ?? []).length;

export type DocToMarkdownOptions = {
  /**
   * The document's first node is the synthetic title markdownToDoc added
   * (`LoadedBlock.synthetic`): while it is empty it writes nothing, so posts
   * without a title save unchanged. Without this flag an empty first `##`
   * is a real heading and is written.
   */
  syntheticTitle?: boolean;
};

/**
 * Converts TipTap JSON back into the post's Markdown: top-level blocks
 * separated by a blank line, `rawBlock`s verbatim, then `definitions` (link
 * references / footnotes, from markdownToDoc) verbatim after a blank line.
 *
 * Throws UnserializableError for shapes Markdown can't hold (a table cell
 * with more than one paragraph, a mismatched table, a line break in a table
 * cell or heading, unknown nodes or marks) rather than dropping them, and
 * when the whole document wouldn't read back as one block per written block
 * (a block merging with or swallowing its neighbour, e.g. after an unclosed
 * raw fence).
 */
export function docToMarkdown(
  doc: JSONContent,
  definitions?: string,
  options: DocToMarkdownOptions = {},
): string {
  const content = doc.content ?? [];
  const skip = options.syntheticTitle && isEmptyTitle(content[0]) ? 1 : 0;
  const laid = layoutBlocks(content.slice(skip), skip, true);
  const body = joinBlocks(laid);
  const markdown = !definitions ? body : body ? `${body}\n\n${definitions}` : definitions;

  // Safety net: the saved text must split back into exactly these blocks.
  const read = splitTopLevelBlocks(markdown).blocks.map((b) => b.source);
  const bad = laid.findIndex((entry, i) => read[i] !== entry.text);
  if (bad !== -1 || read.length !== laid.length) {
    const entry = laid[bad === -1 ? laid.length - 1 : bad];
    throw new UnserializableError(
      `Saving would change the document at block ${entry.index + 1} (${entry.node.type}): it would merge with or swallow the block next to it. Undo the last change, or fix it in Source mode.`,
      entry.index,
    );
  }
  return markdown;
}
