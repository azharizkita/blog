import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { markdownToDoc } from "@/components/editor/wysiwyg/bridge/to-doc";
import { encodeAttribute } from "@/lib/markdown/attributes";
import { convertLegacyMarkdown } from "@/lib/markdown/legacy";

const TITLE = "## T";
const TITLE_JSON = {
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text: "T" }],
};

/** The JSON of the single block that follows a `## T` title. */
function body(markdown: string) {
  const { doc, blocks } = markdownToDoc(`${TITLE}\n\n${markdown}`);
  expect(doc.content?.[0]).toEqual(TITLE_JSON);
  expect(doc.content).toHaveLength(2);
  expect(blocks).toHaveLength(2);
  return doc.content![1];
}

const text = (t: string, marks?: unknown[]) =>
  marks ? { type: "text", text: t, marks } : { type: "text", text: t };
const para = (...content: unknown[]) =>
  content.length ? { type: "paragraph", content } : { type: "paragraph" };
const raw = (source: string) => ({ type: "rawBlock", attrs: { source } });

describe("markdownToDoc", () => {
  describe("maps every node type", () => {
    it("heading levels 2-4", () => {
      for (const level of [2, 3, 4]) {
        expect(body(`${"#".repeat(level)} Hi`)).toEqual({
          type: "heading",
          attrs: { level },
          content: [text("Hi")],
        });
      }
    });

    it("paragraph", () => {
      expect(body("Hello world")).toEqual(para(text("Hello world")));
    });

    it("bold, italic, strike and code marks", () => {
      expect(body("**b** *i* ~~s~~ `c`")).toEqual(
        para(
          text("b", [{ type: "bold" }]),
          text(" "),
          text("i", [{ type: "italic" }]),
          text(" "),
          text("s", [{ type: "strike" }]),
          text(" "),
          text("c", [{ type: "code" }]),
        ),
      );
    });

    it("nested marks use one canonical order", () => {
      // Schema rank order (link, bold, code, italic, strike), whatever the
      // nesting; adjacent runs with equal marks merge.
      const both = [{ type: "bold" }, { type: "italic" }];
      expect(body("*__x__*")).toEqual(para(text("x", both)));
      expect(body("__*x*__")).toEqual(para(text("x", both)));
      expect(body("~~*[a](/p)*~~")).toEqual(
        para(
          text("a", [
            { type: "link", attrs: { href: "/p", title: null } },
            { type: "italic" },
            { type: "strike" },
          ]),
        ),
      );
      expect(body("*a **b***")).toEqual(
        para(text("a ", [{ type: "italic" }]), text("b", both)),
      );
    });

    it("link with and without title", () => {
      expect(body('[a](https://x.dev "T") [b](/p)')).toEqual(
        para(
          text("a", [
            { type: "link", attrs: { href: "https://x.dev", title: "T" } },
          ]),
          text(" "),
          text("b", [{ type: "link", attrs: { href: "/p", title: null } }]),
        ),
      );
    });

    it("image (inline)", () => {
      expect(body('![alt text](https://x.dev/a.png "Cap")')).toEqual(
        para({
          type: "image",
          attrs: { src: "https://x.dev/a.png", alt: "alt text", title: "Cap" },
        }),
      );
    });

    it("hard break", () => {
      expect(body("a\\\nb")).toEqual(
        para(text("a"), { type: "hardBreak" }, text("b")),
      );
    });

    it("bullet list", () => {
      expect(body("- a\n- b")).toEqual({
        type: "bulletList",
        content: [
          { type: "listItem", content: [para(text("a"))] },
          { type: "listItem", content: [para(text("b"))] },
        ],
      });
    });

    it("ordered list with start", () => {
      expect(body("3. a\n4. b")).toEqual({
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          { type: "listItem", content: [para(text("a"))] },
          { type: "listItem", content: [para(text("b"))] },
        ],
      });
      expect(body("1. a")).toEqual({
        type: "orderedList",
        attrs: { start: 1 },
        content: [{ type: "listItem", content: [para(text("a"))] }],
      });
    });

    it("nested list", () => {
      expect(body("- a\n  - b")).toEqual({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              para(text("a")),
              {
                type: "bulletList",
                content: [{ type: "listItem", content: [para(text("b"))] }],
              },
            ],
          },
        ],
      });
    });

    it("blockquote", () => {
      expect(body("> quoted\n>\n> second")).toEqual({
        type: "blockquote",
        content: [para(text("quoted")), para(text("second"))],
      });
    });

    it("code block with and without language", () => {
      expect(body("```ts\nconst a = 1;\n```")).toEqual({
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [text("const a = 1;")],
      });
      expect(body("```\nplain\n```")).toEqual({
        type: "codeBlock",
        attrs: { language: null },
        content: [text("plain")],
      });
    });

    it("horizontal rule", () => {
      expect(body("---")).toEqual({ type: "horizontalRule" });
    });

    it("table", () => {
      expect(body("| h1 | **h2** |\n| --- | --- |\n| a | |")).toEqual({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [para(text("h1"))] },
              {
                type: "tableHeader",
                content: [para(text("h2", [{ type: "bold" }]))],
              },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [para(text("a"))] },
              { type: "tableCell", content: [para()] },
            ],
          },
        ],
      });
    });
  });

  describe("embeds become blocks", () => {
    it("apple music", () => {
      expect(body('<!-- ::apple-music url="https://m.dev/1" title="Song" -->')).toEqual({
        type: "appleMusicBlock",
        attrs: { url: "https://m.dev/1", title: "Song" },
      });
      expect(body('<!-- ::apple-music url="https://m.dev/1" -->')).toEqual({
        type: "appleMusicBlock",
        attrs: { url: "https://m.dev/1", title: null },
      });
    });

    it("youtube", () => {
      expect(body('<!-- ::youtube id="abc" title="Vid" -->')).toEqual({
        type: "youtubeBlock",
        attrs: { id: "abc", title: "Vid" },
      });
    });

    it("envelope with decoded text", () => {
      const value = 'She said "hi" & left\nthe end';
      expect(
        body(`<!-- ::envelope text="${encodeAttribute(value)}" -->`),
      ).toEqual({ type: "envelopeBlock", attrs: { text: value } });
    });

    it("mermaid with height", () => {
      expect(body("```mermaid height=300\ngraph TD\n  A-->B\n```")).toEqual({
        type: "mermaidBlock",
        attrs: { code: "graph TD\n  A-->B", height: "300" },
      });
      expect(body("```mermaid\ngraph TD\n```")).toEqual({
        type: "mermaidBlock",
        attrs: { code: "graph TD", height: null },
      });
    });

    it("TIP callout with a nested paragraph", () => {
      expect(body("> [!TIP]\n> Use **this**.")).toEqual({
        type: "calloutBlock",
        attrs: { kind: "TIP" },
        content: [para(text("Use "), text("this", [{ type: "bold" }]), text("."))],
      });
    });
  });

  it("callouts keep their original kind", () => {
    for (const kind of ["NOTE", "IMPORTANT", "WARNING", "CAUTION"]) {
      expect(body(`> [!${kind}]\n> x`)).toEqual({
        type: "calloutBlock",
        attrs: { kind },
        content: [para(text("x"))],
      });
    }
  });

  it("callouts with a custom title or an unknown kind are raw", () => {
    const titled = "> [!TIP] Custom title\n> x";
    expect(body(titled)).toEqual(raw(titled));
    expect(body("> [!FOO]\n> x")).toEqual(raw("> [!FOO]\n> x"));
  });

  it("mermaid with meta other than height is raw", () => {
    const titled = '```mermaid height=300 title="Flow"\ngraph TD\n```';
    expect(body(titled)).toEqual(raw(titled));
    const lines = "```mermaid {1}\ngraph TD\n```";
    expect(body(lines)).toEqual(raw(lines));
    expect(body("```mermaid height=520\ngraph TD\n```")).toEqual({
      type: "mermaidBlock",
      attrs: { code: "graph TD", height: "520" },
    });
  });

  it("unknown component becomes rawBlock", () => {
    const source = '<!-- ::spotify id="x" -->';
    const { doc, blocks } = markdownToDoc(`${TITLE}\n\n${source}`);
    expect(doc.content?.[1]).toEqual({
      type: "rawBlock",
      attrs: { source: '<!-- ::spotify id="x" -->' },
    });
    expect(blocks[1]).toMatchObject({ source, raw: true });
    expect(blocks[0].raw).toBe(false);
  });

  it("level-1 heading maps to heading level 1", () => {
    expect(body("# Big")).toEqual({
      type: "heading",
      attrs: { level: 1 },
      content: [text("Big")],
    });
    // Shapes the fixtures use: an empty `# ` and an image inside an h1.
    expect(body("# ")).toEqual({ type: "heading", attrs: { level: 1 } });
    expect(body("# ![cover](https://x.dev/a.jpg)")).toEqual({
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "image",
          attrs: { src: "https://x.dev/a.jpg", alt: "cover", title: null },
        },
      ],
    });
  });

  it("level-5 and level-6 headings become rawBlock", () => {
    expect(body("##### Small")).toEqual(raw("##### Small"));
    expect(body("###### Tiny")).toEqual(raw("###### Tiny"));
  });

  describe("raw fallbacks", () => {
    it("a nested unmappable node makes the whole top-level block raw", () => {
      const quote = '> intro\n>\n> <!-- ::spotify id="x" -->';
      expect(body(quote)).toEqual(raw(quote));
    });

    it("footnote references make the block raw; definitions pass through", () => {
      const { doc, blocks, definitions } = markdownToDoc(
        `${TITLE}\n\nSee[^1].\n\n[^1]: The note.`,
      );
      expect(doc.content).toEqual([TITLE_JSON, raw("See[^1].")]);
      expect(blocks.map((b) => b.raw)).toEqual([false, true]);
      expect(definitions).toBe("[^1]: The note.");
    });

    it("task list items, code meta and inline code inside a link are raw", () => {
      expect(body("- [ ] todo")).toEqual(raw("- [ ] todo"));
      expect(body("```js {1}\nx\n```")).toEqual(raw("```js {1}\nx\n```"));
      expect(body("[`x`](/y)")).toEqual(raw("[`x`](/y)"));
    });

    it("loose lists and aligned tables are raw", () => {
      expect(body("- a\n\n- b")).toEqual(raw("- a\n\n- b"));
      const table = "| a | b |\n| :-- | --: |\n| 1 | 2 |";
      expect(body(table)).toEqual(raw(table));
    });

    it("a failing fidelity check makes the block raw", () => {
      const { doc, blocks } = markdownToDoc(`${TITLE}\n\nplain`, (block) =>
        block.source !== "plain",
      );
      expect(doc.content?.[1]).toEqual(raw("plain"));
      expect(blocks[1].raw).toBe(true);
    });
  });

  describe("title", () => {
    it("a new or empty source gives an empty level-2 heading", () => {
      for (const source of ["", "  \n\n"]) {
        const { doc, blocks, definitions } = markdownToDoc(source);
        expect(doc).toEqual({
          type: "doc",
          content: [{ type: "heading", attrs: { level: 2 } }],
        });
        expect(blocks).toHaveLength(1);
        expect(definitions).toBe("");
      }
    });

    it("a post without a ## title gets an empty synthetic title", () => {
      const { doc, blocks } = markdownToDoc("# Big\n\ntext");
      expect(doc.content).toEqual([
        { type: "heading", attrs: { level: 2 } },
        { type: "heading", attrs: { level: 1 }, content: [text("Big")] },
        para(text("text")),
      ]);
      expect(blocks.map((b) => b.source)).toEqual(["", "# Big", "text"]);
      expect(blocks.map((b) => b.raw)).toEqual([false, false, false]);
      expect(blocks[0].synthetic).toBe(true);
    });

    it("doc.content[i] corresponds to blocks[i]", () => {
      const { doc, blocks } = markdownToDoc("## A\n\npara\n\n- x\n\n##### H5");
      expect(doc.content).toHaveLength(blocks.length);
      expect(blocks.map((b) => [b.source, b.raw])).toEqual([
        ["## A", false],
        ["para", false],
        ["- x", false],
        ["##### H5", true],
      ]);
    });
  });

  it("every fixture opens", () => {
    const dir = join(__dirname, "..", "fixtures", "posts");
    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const { content } = convertLegacyMarkdown(readFileSync(join(dir, file), "utf8"));
      const { doc, blocks } = markdownToDoc(content);
      expect(doc.content?.[0], file).toMatchObject({
        type: "heading",
        attrs: { level: 2 },
      });
      expect(doc.content, file).toHaveLength(blocks.length);
      expect(blocks.filter((b) => b.raw).map((b) => b.source), file).toEqual([]);
    }
  });
});
