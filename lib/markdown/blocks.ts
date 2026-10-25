import type { MarkdownExtension } from "@tanstack/markdown";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { parseArticle, parseOptions } from "./config";

type BlockNode = ReturnType<typeof parseArticle>["children"][number];

export type TopLevelBlock = { source: string; node: BlockNode };

export type SplitResult = { blocks: TopLevelBlock[]; definitions: string };

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
// Exported for the editor serializer, which must not write lines these match.
export const FOOTNOTE = /^ {0,3}\[\^([^\]\n]+)\]:[ \t]*(.*)$/;
export const REFERENCE = /^ {0,3}\[([^\]\n]+)\]:[ \t]*(\S.*)$/;
// Same pattern as parseDestination (dist/utils.js:66-73); not exported.
export const DESTINATION =
  /^(?:<([^<>\n]*)>|([^<>\s]*?))(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?$/;
const CONTINUATION = /^(?: {4,}|\t)/;

/**
 * Collects the exact original text of every link-reference and footnote
 * definition (with footnote continuation lines). Mirrors the parser's own
 * `extractDefinitions` (@tanstack/markdown dist/parser.js, ~329-376): fence
 * tracking, the footnote and reference line patterns and the continuation rule.
 * That function is not exported, so the rules are repeated here.
 */
function collectDefinitions(lines: string[]): string[] {
  const out: string[] = [];
  let activeFence = "";
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence =
      (!activeFence || line.includes(activeFence)) && line.match(FENCE);
    if (fence) {
      if (!activeFence) activeFence = fence[1];
      else if (fence[1].startsWith(activeFence) && /^\s*$/.test(fence[2]))
        activeFence = "";
    } else if (!activeFence) {
      if (FOOTNOTE.test(line)) {
        const chunk = [line];
        i++;
        while (i < lines.length && CONTINUATION.test(lines[i])) {
          chunk.push(lines[i]);
          i++;
        }
        out.push(chunk.join("\n"));
        continue;
      }
      const def = line.match(REFERENCE);
      if (def && DESTINATION.test(def[2].trimEnd())) {
        out.push(line);
        i++;
        continue;
      }
    }
    i++;
  }
  return out;
}

/**
 * Splits a document into its top-level blocks, each with its exact source
 * text (blank lines trimmed) and the node the full document yields for it.
 * Definitions (link references, footnotes) belong to no block, so they are
 * returned separately; save blocks.join("\n\n") + "\n\n" + definitions.
 *
 * Top level detection: the parser calls every extension's `parseBlock` for
 * each block start, and nested content goes through `parseBlocks`, which
 * builds a fresh `lines` array. The very first call of a parse is always the
 * top-level one, so its `lines` array is the document's own; later calls whose
 * `lines` is the same array (by identity) are top-level block starts.
 * Frontmatter is disabled in parseOptions, so those lines are the original
 * lines minus definitions.
 */
export function splitTopLevelBlocks(source: string): SplitResult {
  let topLines: string[] | undefined;
  const starts: number[] = [];
  const recorder: MarkdownExtension = {
    name: "block-recorder",
    parseBlock(context) {
      topLines ??= context.lines;
      if (context.lines === topLines) starts.push(context.index);
      return undefined;
    },
  };

  const full = parseMarkdown(source, {
    ...parseOptions,
    extensions: [recorder, ...(parseOptions.extensions ?? [])],
  });

  const definitions = collectDefinitions(
    source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n"),
  ).join("\n\n");

  const lines = topLines;
  if (!lines) return { blocks: [], definitions };
  const texts = starts.map((start, i) =>
    lines
      .slice(start, starts[i + 1] ?? lines.length)
      .join("\n")
      .replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, ""),
  );
  // Nodes come straight from the full parse (so footnote numbering matches);
  // the trailing generated footnotes block, if any, is extra.
  const aligned = full.children.length >= texts.length;
  const blocks = texts.map((text, i) => ({
    source: text,
    node: aligned
      ? full.children[i]
      : parseArticle(text + (definitions ? "\n\n" + definitions : ""))
          .children[0],
  }));
  return { blocks, definitions };
}
