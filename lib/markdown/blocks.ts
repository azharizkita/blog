import type { MarkdownExtension } from "@tanstack/markdown";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { parseArticle, parseOptions } from "./config";

type BlockNode = ReturnType<typeof parseArticle>["children"][number];

export type TopLevelBlock = { source: string; node: BlockNode };

/**
 * Splits a document into its top-level blocks, each with its exact source
 * text (blank lines trimmed) and the node `parseArticle` yields for it.
 *
 * Top level detection: the parser calls every extension's `parseBlock` for
 * each block start, and nested content goes through `parseBlocks`, which
 * builds a fresh `lines` array. The very first call of a parse is always the
 * top-level one, so its `lines` array is the document's own; later calls whose
 * `lines` is the same array (by identity) are top-level block starts.
 *
 * Lines are those the parser sees: frontmatter and link/footnote definition
 * lines are already stripped, so sources omit them.
 */
export function splitTopLevelBlocks(source: string): TopLevelBlock[] {
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

  parseMarkdown(source, {
    ...parseOptions,
    extensions: [recorder, ...(parseOptions.extensions ?? [])],
  });

  const lines = topLines;
  if (!lines) return [];
  const blocks: TopLevelBlock[] = [];
  starts.forEach((start, i) => {
    const end = starts[i + 1] ?? lines.length;
    const text = lines
      .slice(start, end)
      .join("\n")
      .replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "");
    if (!text.trim()) return;
    blocks.push({ source: text, node: parseArticle(text).children[0] });
  });
  return blocks;
}
