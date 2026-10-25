import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { markdownToDoc } from "@/components/editor/wysiwyg/bridge/to-doc";
import { planPaste, type PastePlan } from "@/components/editor/wysiwyg/paste";

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

describe("planPaste", () => {
  const paragraphs = (plan: PastePlan) => {
    expect(plan.kind).toBe("blocks");
    return plan.kind === "blocks" ? plan.content : [];
  };
  const hasBreakOrNewline = (nodes: JSONContent[]): boolean =>
    nodes.some(
      (n) =>
        n.type === "hardBreak" ||
        (n.type === "text" && (n.text ?? "").includes("\n")) ||
        (n.type !== "codeBlock" && hasBreakOrNewline(n.content ?? [])),
    );

  it("flattens into one line in a heading or cell", () => {
    for (const text of ["a\\\nb", "a  \nb tail", "line one\nline two", "a\n\nb", "- x\n- y"]) {
      const content = paragraphs(planPaste(text, "inline"));
      expect(content, text).toHaveLength(1);
      expect(content[0].type).toBe("paragraph");
      expect(hasBreakOrNewline(content), text).toBe(false);
    }
    expect(paragraphs(planPaste("a\\\nb", "inline"))[0].content).toEqual([
      { type: "text", text: "a b" },
    ]);
  });

  it("keeps marks when flattening", () => {
    expect(types(paragraphs(planPaste("**b**\n\n*i*", "inline")))).toEqual([
      "paragraph",
      "text",
      "bold",
      "text",
      "text",
      "italic",
    ]);
  });

  it("pastes one line of text when a block has no inline form", () => {
    expect(planPaste("foo\n\n```\ncode here\n```", "inline")).toEqual({
      kind: "text",
      text: "foo ``` code here ```",
    });
    expect(planPaste('<!-- ::youtube id="abcdefghijk" -->', "inline").kind).toBe("text");
  });

  it("turns soft line breaks into spaces, keeps hard breaks in blocks", () => {
    const [p] = paragraphs(planPaste("line one\nline two", "block"));
    expect(p.content).toEqual([{ type: "text", text: "line one line two" }]);
    expect(types(paragraphs(planPaste("a\\\nb", "block")))).toContain("hardBreak");
    const [code] = paragraphs(planPaste("```\na\nb\n```", "block"));
    expect(code.content?.[0].text).toBe("a\nb");
  });

  it("declines Markdown when definitions would be dropped", () => {
    expect(planPaste("a claim[^1]\n\n[^1]: the note", "block")).toEqual({ kind: "default" });
    expect(planPaste("see [docs][1]\n\n[1]: https://x.com", "block")).toEqual({ kind: "default" });
    expect(planPaste("a claim[^1]\n\n[^1]: the note", "inline")).toEqual({
      kind: "text",
      text: "a claim[^1] [^1]: the note",
    });
  });

  it("plain paste skips Markdown", () => {
    expect(planPaste("**b**\n\nc", "block", true)).toEqual({
      kind: "blocks",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "**b**" }] },
        { type: "paragraph", content: [{ type: "text", text: "c" }] },
      ],
    });
    expect(planPaste("**b**\nc", "inline", true)).toEqual({ kind: "text", text: "**b** c" });
  });

  it("reads Markdown blocks elsewhere", () => {
    expect(types(paragraphs(planPaste("**b**\n\n> q", "block")))).toEqual([
      "paragraph",
      "text",
      "bold",
      "blockquote",
      "paragraph",
      "text",
    ]);
  });
});
