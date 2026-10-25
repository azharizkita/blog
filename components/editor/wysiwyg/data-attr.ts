import type { Attribute } from "@tiptap/react";

/**
 * A string node attribute kept in a `data-*` HTML attribute (used when the
 * node is copied, pasted or dragged as HTML). Parsed as a string on purpose:
 * TipTap's default attribute parsing turns numeric-looking values into
 * numbers (a mermaid `height="400"` would come back as 400, which the save
 * guard rightly reads as a different block). A missing attribute reads as
 * `fallback`.
 */
export function dataAttr(name: string, fallback: string | null): Attribute {
  return {
    default: fallback,
    parseHTML: (element) => element.getAttribute(`data-${name}`) ?? fallback,
    renderHTML: (attributes) =>
      attributes[name] === null || attributes[name] === undefined
        ? {}
        : { [`data-${name}`]: String(attributes[name]) },
  };
}
