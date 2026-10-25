/**
 * The TipTap node and mark names (and the attrs each carries) that the
 * Markdown bridge produces and consumes. The editor's extensions
 * (../extensions.ts and the *-block.tsx node views) must register exactly
 * these names; `youtubeBlock`, `calloutBlock` and `rawBlock`, the
 * `appleMusicBlock.title` attr and heading level 1 are added to the editor
 * in Task 10.
 *
 * Attr contract (absent optional values are `null`):
 * - heading `{ level: 1 | 2 | 3 | 4 }`; orderedList `{ start }`;
 *   codeBlock `{ language }`; image (inline) `{ src, alt, title }`
 * - mermaidBlock `{ code, height }` (height is the fence's `height=N`, a string)
 * - envelopeBlock `{ text }`; appleMusicBlock `{ url, title }`;
 *   youtubeBlock `{ id, title }`
 * - calloutBlock `{ kind }`, content `block+`; kind is the callout kind as
 *   written (upper-cased): NOTE | TIP | IMPORTANT | WARNING | CAUTION
 * - rawBlock `{ source }`: a locked block holding its exact Markdown source
 * - link mark `{ href, title }`
 */
export const NODES = {
  doc: "doc",
  heading: "heading",
  paragraph: "paragraph",
  text: "text",
  bulletList: "bulletList",
  orderedList: "orderedList",
  listItem: "listItem",
  blockquote: "blockquote",
  codeBlock: "codeBlock",
  horizontalRule: "horizontalRule",
  table: "table",
  tableRow: "tableRow",
  tableHeader: "tableHeader",
  tableCell: "tableCell",
  image: "image",
  hardBreak: "hardBreak",
  mermaidBlock: "mermaidBlock",
  envelopeBlock: "envelopeBlock",
  appleMusicBlock: "appleMusicBlock",
  youtubeBlock: "youtubeBlock",
  calloutBlock: "calloutBlock",
  rawBlock: "rawBlock",
} as const;

export const MARKS = {
  bold: "bold",
  italic: "italic",
  strike: "strike",
  code: "code",
  link: "link",
} as const;

/**
 * Canonical mark order, matching the editor schema's mark rank: TipTap sorts
 * extensions by priority (Link is 1000, the rest default 100) and keeps
 * registration order otherwise, and StarterKit registers bold, code, italic,
 * strike in that order (node_modules/@tiptap/starter-kit/dist/index.js).
 * Every text node's marks are emitted in this order.
 */
export const MARK_ORDER: readonly MarkName[] = [
  MARKS.link,
  MARKS.bold,
  MARKS.code,
  MARKS.italic,
  MARKS.strike,
];

export type NodeName = (typeof NODES)[keyof typeof NODES];
export type MarkName = (typeof MARKS)[keyof typeof MARKS];

/**
 * Heading levels the editor holds (level 1 is added to the editor schema in
 * Task 10); the first heading (title) is always level 2.
 */
export const HEADING_LEVELS = [1, 2, 3, 4] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

export const CALLOUT_KINDS = [
  "NOTE",
  "TIP",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];
