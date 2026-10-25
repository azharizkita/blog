import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { markdownToDoc } from "@/components/editor/wysiwyg/bridge/to-doc";
import { docToMarkdown } from "@/components/editor/wysiwyg/bridge/to-markdown";
import { checkSave } from "@/components/editor/wysiwyg/save-guard";
import { parseArticle } from "@/lib/markdown/config";
import { convertLegacyMarkdown } from "@/lib/markdown/legacy";

const dir = join(__dirname, "..", "fixtures", "posts");
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .map((file) => ({
    file,
    source: convertLegacyMarkdown(readFileSync(join(dir, file), "utf8")).content,
  }));

const clone = <T>(value: T): T => structuredClone(value);
const text = (t: string, marks?: JSONContent["marks"]): JSONContent =>
  marks ? { type: "text", text: t, marks } : { type: "text", text: t };
const para = (...content: JSONContent[]): JSONContent =>
  content.length ? { type: "paragraph", content } : { type: "paragraph" };

/**
 * What the editor's getJSON() adds on top of the bridge's attrs (TipTap
 * defaults for link, image, orderedList and table cells).
 */
function asEditor(node: JSONContent): JSONContent {
  const out: JSONContent = { ...node };
  const add = (extra: Record<string, unknown>) => {
    out.attrs = { ...extra, ...(node.attrs ?? {}) };
  };
  if (node.type === "image") add({ width: null, height: null });
  if (node.type === "orderedList") add({ type: null });
  if (node.type === "tableCell" || node.type === "tableHeader")
    add({ colspan: 1, rowspan: 1, colwidth: null });
  if (node.marks)
    out.marks = node.marks.map((m) =>
      m.type === "link"
        ? {
            ...m,
            attrs: {
              target: "_blank",
              rel: "noopener noreferrer nofollow",
              class: null,
              ...m.attrs,
            },
          }
        : m,
    );
  if (node.content) out.content = node.content.map(asEditor);
  return out;
}

/** Loads Markdown the way the editor does: bridge doc, loaded blocks, captured top-level nodes. */
function load(source: string) {
  const loaded = markdownToDoc(source);
  const doc = asEditor(loaded.doc);
  return {
    ...loaded,
    doc,
    args: {
      loaded: loaded.blocks,
      loadedDoc: clone(doc.content ?? []),
      definitions: loaded.definitions,
    },
  };
}

const MUSIC = '<!-- ::apple-music url="https://m.dev/1" title="Song" -->';
const SOURCE = [
  "## Title",
  "First paragraph with [a link](https://x.dev) and ![pic](/a.png).",
  MUSIC,
  "1. one\n2. two",
  "##### Deep heading",
  "Last paragraph.",
].join("\n\n");

describe("checkSave", () => {
  it("unchanged doc passes and returns markdown", () => {
    const { doc, args } = load(SOURCE);
    const result = checkSave({ ...args, doc });
    expect(result).toEqual({ ok: true, markdown: SOURCE });
  });

  it("user edit passes", () => {
    const { doc, args } = load(SOURCE);
    doc.content![5] = para(text("Edited last paragraph."));
    const result = checkSave({ ...args, doc });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.markdown).toContain("Edited last paragraph.");
  });

  it("rawBlock source survives", () => {
    const { doc, args } = load(SOURCE);
    expect(doc.content![4]).toEqual({
      type: "rawBlock",
      attrs: { source: "##### Deep heading" },
    });
    doc.content![5] = para(text("Right after the raw block."));
    const result = checkSave({ ...args, doc });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.markdown).toContain("\n\n##### Deep heading\n\n");
  });

  it("serializer that drops an embed is caught", () => {
    const { doc, args } = load(SOURCE);
    expect(doc.content![2].type).toBe("appleMusicBlock");
    const result = checkSave({
      ...args,
      doc,
      serialize: (d, definitions, options) =>
        docToMarkdown(
          { ...d, content: d.content!.filter((n) => n.type !== "appleMusicBlock") },
          definitions,
          options,
        ),
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "lossy",
      blockIndex: 2,
      loadedSource: MUSIC,
      savingSource: null,
    });
  });

  it("serializer that changes an embed attribute is caught", () => {
    const { doc, args } = load(SOURCE);
    const result = checkSave({
      ...args,
      doc,
      serialize: (d, definitions, options) =>
        docToMarkdown(d, definitions, options).replace(' title="Song"', ""),
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "lossy",
      blockIndex: 2,
      loadedSource: MUSIC,
      savingSource: '<!-- ::apple-music url="https://m.dev/1" -->',
    });
  });

  it("formatting-only differences pass", () => {
    const source = "## T\n\nSome _x_ here.\n\n* item\n* other";
    const { doc, args } = load(source);
    const result = checkSave({ ...args, doc });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markdown).not.toBe(source);
      expect(parseArticle(result.markdown)).toEqual(parseArticle(source));
    }
  });

  it("unserializable table reports", () => {
    const { doc, args } = load("## T\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter.");
    const table = doc.content![1];
    expect(table.type).toBe("table");
    table.content![0].content![0].content!.push(para(text("second")));
    const result = checkSave({ ...args, doc });
    expect(result).toMatchObject({
      ok: false,
      reason: "unserializable",
      blockIndex: 1,
      loadedSource: "| a | b |\n| --- | --- |\n| 1 | 2 |",
      savingSource: null,
    });
    if (!result.ok) expect(result.message).toContain("This table can't be saved as Markdown");
  });

  it("list-merge errors carry their block index", () => {
    const { doc, args } = load("## T\n\n1. a\n\nEnd.");
    const raw = (source: string): JSONContent => ({ type: "rawBlock", attrs: { source } });
    // Raw ordered lists using both delimiters leave none for the list between them.
    doc.content!.splice(1, 0, raw("1. x\n\n2. y"));
    doc.content!.splice(3, 0, raw("1) x\n\n2) y"));
    const result = checkSave({ ...args, doc });
    expect(result).toMatchObject({ ok: false, reason: "unserializable", blockIndex: 2 });
    if (!result.ok) expect(result.message).toContain("lists next to it");
  });

  it("whole-document safety net errors carry their block index", () => {
    const { doc, args } = load("## T\n\nMiddle.\n\nEnd.");
    doc.content![1] = { type: "rawBlock", attrs: { source: "```\nunclosed" } };
    const result = checkSave({ ...args, doc });
    expect(result).toMatchObject({
      ok: false,
      reason: "unserializable",
      blockIndex: 1,
      loadedSource: "Middle.",
      savingSource: null,
    });
    if (!result.ok) expect(result.message).toContain("would merge with or swallow");
  });

  it("a list item with two paragraphs reloads as a raw block and passes", () => {
    const { doc, args } = load("## T\n\n- one\n- two");
    doc.content![1].content![0].content!.push(para(text("more")));
    const result = checkSave({ ...args, doc });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(markdownToDoc(result.markdown).doc.content![1].type).toBe("rawBlock");
    }
  });

  it("blanks the parser drops anyway do not false-alarm", () => {
    const { doc, args } = load(SOURCE);
    doc.content![5] = para(
      text("  leading and trailing  "),
      { type: "hardBreak" },
      text("   next line"),
      { type: "hardBreak" },
    );
    doc.content!.splice(3, 0, para(), para(text("   ")));
    const result = checkSave({ ...args, doc });
    expect(result.ok).toBe(true);
  });

  it("split text runs and mark order do not false-alarm", () => {
    const { doc, args } = load("## T\n\n**bold [link](https://x.dev)** tail");
    const p = doc.content![1];
    p.content = [
      text("bo", [{ type: "bold" }]),
      text("ld ", [{ type: "bold" }]),
      ...p.content!.slice(1).map((n) =>
        n.marks ? { ...n, marks: [...n.marks].reverse() } : n,
      ),
    ];
    expect(checkSave({ ...args, doc }).ok).toBe(true);
  });

  it("inserted and deleted blocks keep unchanged blocks checked", () => {
    const { doc, args } = load(SOURCE);
    doc.content!.splice(1, 1); // delete the first paragraph
    doc.content!.splice(2, 0, para(text("New paragraph."))); // insert after the embed
    const result = checkSave({ ...args, doc });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.markdown).toContain(MUSIC);
  });

  it("typing a title into the synthetic heading passes", () => {
    const { doc, args } = load("Body without a title.");
    expect(args.loaded[0].synthetic).toBe(true);
    expect(checkSave({ ...args, doc })).toEqual({ ok: true, markdown: "Body without a title." });
    doc.content![0] = { type: "heading", attrs: { level: 2 }, content: [text("Now titled")] };
    const result = checkSave({ ...args, doc });
    expect(result).toEqual({ ok: true, markdown: "## Now titled\n\nBody without a title." });
  });

  it("check B catches an unchanged block whose saved AST differs from the loaded one", () => {
    const { doc, args } = load(SOURCE);
    const loaded = clone(args.loaded);
    // As if the load-time parse had seen a different node for block 4.
    loaded[4] = { ...loaded[4], node: { type: "heading", depth: 5, children: [] } as never };
    const result = checkSave({ ...args, loaded, doc });
    expect(result).toMatchObject({
      ok: false,
      reason: "lossy",
      blockIndex: 4,
      loadedSource: "##### Deep heading",
      savingSource: "##### Deep heading",
    });
  });

  it("every fixture: unchanged doc passes and re-parses to the source AST", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    for (const { file, source } of fixtures) {
      const { doc, args } = load(source);
      const result = checkSave({ ...args, doc });
      expect(result.ok, file).toBe(true);
      if (result.ok) expect(parseArticle(result.markdown), file).toEqual(parseArticle(source));
    }
  });
});
