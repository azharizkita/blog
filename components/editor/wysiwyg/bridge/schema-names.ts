/**
 * The TipTap node and mark names (and the attrs each carries) that the
 * Markdown bridge produces and consumes. The editor's extensions
 * (../extensions.ts and the *-block.tsx node views) must register exactly
 * these names; `youtubeBlock`, `calloutBlock` and `rawBlock` and the
 * `appleMusicBlock.title` attr are added to the editor in Task 10.
 *
 * Attr contract (absent optional values are `null`):
 * - heading `{ level: 2 | 3 | 4 }`; orderedList `{ start }`;
 *   codeBlock `{ language }`; image (inline) `{ src, alt, title }`
 * - mermaidBlock `{ code, height }` (height is the fence's `height=N`, a string)
 * - envelopeBlock `{ text }`; appleMusicBlock `{ url, title }`;
 *   youtubeBlock `{ id, title }`
 * - calloutBlock `{ kind: "note" | "tip" | "warn" }`, content `block+`
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

export type NodeName = (typeof NODES)[keyof typeof NODES];
export type MarkName = (typeof MARKS)[keyof typeof MARKS];

/** Heading levels the editor offers; the first heading (title) is level 2. */
export const HEADING_LEVELS = [2, 3, 4] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

export const CALLOUT_KINDS = ["note", "tip", "warn"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];
