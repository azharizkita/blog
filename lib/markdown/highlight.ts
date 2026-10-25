import { createHighlighter } from "@tanstack/highlight/core";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";
import type { CodeHighlighter } from "@tanstack/markdown";
import { css } from "@tanstack/highlight/languages/css";
import { diff } from "@tanstack/highlight/languages/diff";
import { html } from "@tanstack/highlight/languages/html";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { jsx } from "@tanstack/highlight/languages/jsx";
import { markdown } from "@tanstack/highlight/languages/markdown";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { ts } from "@tanstack/highlight/languages/ts";
import { yaml } from "@tanstack/highlight/languages/yaml";

export const highlighter = createHighlighter({
  fallbackLanguage: "plaintext",
  languages: [css, diff, html, js, json, jsx, markdown, plaintext, python, shell, sql, ts, tsx, yaml],
});

/** Canonical language name; unknown languages fall back to plaintext. */
export function normalizeLang(lang?: string): string {
  const name = highlighter.normalizeLanguage(lang?.toLowerCase());
  return highlighter.listLanguages().includes(name) ? name : "plaintext";
}

const base = createTanStackMarkdownHighlighter(highlighter);

export const highlightCode: CodeHighlighter = (code, lang, options) =>
  base(code, normalizeLang(lang), options);

export function codeTokens(
  code: string,
  lang?: string,
): Array<{ value: string; className?: string }> {
  return highlighter.highlight(code, { lang: normalizeLang(lang) }).tokens;
}
