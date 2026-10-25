import type {
  MarkdownDocument,
  ParseOptions,
  RenderOptions,
} from "@tanstack/markdown";
import { calloutsExtension } from "@tanstack/markdown/extensions/callouts";
import { parseMarkdown } from "@tanstack/markdown/parser";
import getSlug from "@/lib/get-slug";
import {
  articleComponentsExtension,
  blockquoteBoundaryExtension,
  calloutComponentExtension,
  mermaidExtension,
} from "./extensions";
import { highlightCode } from "./highlight";

export { highlightCode };

export const parseOptions: ParseOptions = {
  allowHtml: false,
  frontmatter: false,
  headingIds: (text) => getSlug(text),
  extensions: [
    // Callouts must precede the generic blockquote parser.
    calloutsExtension(),
    blockquoteBoundaryExtension(),
    articleComponentsExtension(),
    mermaidExtension(),
    calloutComponentExtension(),
  ],
};

export const renderOptions: RenderOptions = {
  ...parseOptions,
  highlighter: highlightCode,
};

export function parseArticle(source: string): MarkdownDocument {
  return parseMarkdown(source, parseOptions);
}
