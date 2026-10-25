import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { markdownToDoc } from "@/components/editor/wysiwyg/bridge/to-doc";

// Write mode's paste handler (components/editor/wysiwyg/extensions.ts,
// MarkdownPaste) converts pasted text/plain through markdownToDoc and inserts
// the result, dropping the synthetic title. This pins that path.

const types = (nodes: JSONContent[] = []): string[] =>
  nodes.flatMap((node) => [
    node.type!,
    ...(node.marks ?? []).map((mark) => mark.type),
    ...types(node.content),
  ]);

describe("pasted Markdown", () => {
  it("yields marks and embed blocks", () => {
    // A component comment is a block of its own, so it follows a blank line
    // (on the same line it is paragraph text).
    const { doc, blocks } = markdownToDoc('**b** and\n\n<!-- ::youtube id="x" -->');
    expect(blocks[0].synthetic).toBe(true);
    const pasted = doc.content!.slice(1);
    expect(types(pasted)).toContain("bold");
    expect(pasted.find((n) => n.type === "youtubeBlock")).toEqual({
      type: "youtubeBlock",
      attrs: { id: "x", title: null },
    });
  });
});
