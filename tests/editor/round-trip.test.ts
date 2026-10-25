import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { markdownToDoc } from "@/components/editor/wysiwyg/bridge/to-doc";
import {
  blockToMarkdown,
  docToMarkdown,
  UnserializableError,
} from "@/components/editor/wysiwyg/bridge/to-markdown";
import { parseArticle } from "@/lib/markdown/config";
import { convertLegacyMarkdown } from "@/lib/markdown/legacy";

const dir = join(__dirname, "..", "fixtures", "posts");
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .map((file) => ({
    file,
    source: convertLegacyMarkdown(readFileSync(join(dir, file), "utf8")).content,
  }));

const text = (t: string, marks?: JSONContent["marks"]): JSONContent =>
  marks ? { type: "text", text: t, marks } : { type: "text", text: t };
const para = (...content: JSONContent[]): JSONContent =>
  content.length ? { type: "paragraph", content } : { type: "paragraph" };
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });
const TITLE: JSONContent = {
  type: "heading",
  attrs: { level: 2 },
  content: [text("T")],
};

/** Serializes one block after a `## T` title, reloads it, returns its JSON. */
function reload(block: JSONContent): JSONContent {
  const md = docToMarkdown(doc(TITLE, block));
  const loaded = markdownToDoc(md);
  expect(loaded.blocks.map((b) => b.raw), md).toEqual([false, false]);
  return loaded.doc.content![1];
}

describe("docToMarkdown", () => {
  it("every fixture round-trips at AST level", () => {
    expect(fixtures.length).toBeGreaterThan(0);
    for (const { file, source } of fixtures) {
      const { doc: json, definitions, blocks } = markdownToDoc(source);
      const out = docToMarkdown(json, definitions, { syntheticTitle: blocks[0]?.synthetic });
      expect(parseArticle(out), file).toEqual(parseArticle(source));
    }
  });

  it("no fixture gains raw blocks", () => {
    for (const { file, source } of fixtures) {
      const { blocks } = markdownToDoc(source);
      expect(
        blocks.filter((b) => b.raw).map((b) => b.source),
        file,
      ).toEqual([]);
    }
  });

  it("re-serializing a reloaded fixture is stable", () => {
    for (const { file, source } of fixtures) {
      const first = markdownToDoc(source);
      const options = { syntheticTitle: first.blocks[0]?.synthetic };
      const out = docToMarkdown(first.doc, first.definitions, options);
      const second = markdownToDoc(out);
      expect(second.doc, file).toEqual(first.doc);
      expect(
        docToMarkdown(second.doc, second.definitions, {
          syntheticTitle: second.blocks[0]?.synthetic,
        }),
        file,
      ).toBe(out);
    }
  });

  it("envelope attribute with quotes, & and newline round-trips", () => {
    const value = 'She said "hi" & <left>\nthe end';
    const block = { type: "envelopeBlock", attrs: { text: value } };
    expect(blockToMarkdown(block)).toBe(
      '<!-- ::envelope text="She said &quot;hi&quot; &amp; &lt;left&gt;&#10;the end" -->',
    );
    expect(reload(block)).toEqual(block);
  });

  it("apple music and youtube embeds write title only when set", () => {
    const music = { type: "appleMusicBlock", attrs: { url: "https://m.dev/1", title: null } };
    expect(blockToMarkdown(music)).toBe('<!-- ::apple-music url="https://m.dev/1" -->');
    expect(reload(music)).toEqual(music);
    const titled = { type: "appleMusicBlock", attrs: { url: "https://m.dev/1", title: "A & B" } };
    expect(blockToMarkdown(titled)).toBe(
      '<!-- ::apple-music url="https://m.dev/1" title="A &amp; B" -->',
    );
    expect(reload(titled)).toEqual(titled);
    const yt = { type: "youtubeBlock", attrs: { id: "abc", title: null } };
    expect(blockToMarkdown(yt)).toBe('<!-- ::youtube id="abc" -->');
    expect(reload(yt)).toEqual(yt);
    const ytTitled = { type: "youtubeBlock", attrs: { id: "abc", title: "Vid" } };
    expect(blockToMarkdown(ytTitled)).toBe('<!-- ::youtube id="abc" title="Vid" -->');
    expect(reload(ytTitled)).toEqual(ytTitled);
  });

  it("fence containing triple backticks", () => {
    const value = "before\n```\ninside\n```\nafter";
    const block = { type: "codeBlock", attrs: { language: "md" }, content: [text(value)] };
    const md = blockToMarkdown(block);
    expect(md).toBe("````md\n" + value + "\n````");
    expect(reload(block)).toEqual(block);
  });

  it("mermaid fences keep height and grow past inner backticks", () => {
    const block = { type: "mermaidBlock", attrs: { code: "graph TD\n  A-->B", height: "300" } };
    expect(blockToMarkdown(block)).toBe("```mermaid height=300\ngraph TD\n  A-->B\n```");
    expect(reload(block)).toEqual(block);
    const ticks = { type: "mermaidBlock", attrs: { code: "a ```` b", height: null } };
    expect(blockToMarkdown(ticks)).toBe("`````mermaid\na ```` b\n`````");
    expect(reload(ticks)).toEqual(ticks);
  });

  it("link whose text equals its href is never <url>", () => {
    const href = "https://x.dev/a";
    const link = [{ type: "link", attrs: { href, title: null } }];
    const block = para(text(href, link));
    expect(blockToMarkdown(block)).toBe(`[${href}](${href})`);
    expect(blockToMarkdown(block)).not.toContain("<");
    expect(reload(block)).toEqual(block);
  });

  it("links and images with titles", () => {
    const block = para(
      text("a", [{ type: "link", attrs: { href: "/p(1)", title: 'say "hi"' } }]),
      text(" "),
      {
        type: "image",
        attrs: { src: "https://x.dev/a.png", alt: "alt *x*", title: "Cap" },
      },
    );
    expect(blockToMarkdown(block)).toBe(
      "[a](/p\\(1\\) 'say \"hi\"') ![alt \\*x\\*](https://x.dev/a.png \"Cap\")",
    );
    expect(reload(block)).toEqual(block);
  });

  it("table cell with two paragraphs throws UnserializableError", () => {
    const table = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [{ type: "tableHeader", content: [para(text("a")), para(text("b"))] }],
        },
      ],
    };
    expect(() => docToMarkdown(doc(TITLE, table))).toThrow(UnserializableError);
    expect(() => docToMarkdown(doc(TITLE, table))).toThrow(
      "This table can't be saved as Markdown: a cell has more than one paragraph, or the header/body shape doesn't match. Undo the change, or fix it in Source mode.",
    );
  });

  it("hard break inside a table cell throws UnserializableError", () => {
    const table = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [para(text("a"), { type: "hardBreak" }, text("b"))],
            },
          ],
        },
      ],
    };
    expect(() => blockToMarkdown(table)).toThrow(
      new UnserializableError(
        "A line break inside a table cell can't be saved as Markdown. Remove it, or fix it in Source mode.",
      ),
    );
  });

  it("table with escaped pipes and empty cells", () => {
    const cell = (type: string, ...c: JSONContent[]) => ({ type, content: [para(...c)] });
    const table = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [cell("tableHeader", text("a|b")), cell("tableHeader", text("c", [{ type: "code" }]))],
        },
        {
          type: "tableRow",
          content: [cell("tableCell", text("x | y", [{ type: "code" }])), cell("tableCell")],
        },
        { type: "tableRow", content: [cell("tableCell", text("-")), cell("tableCell", text(":-"))] },
      ],
    };
    expect(blockToMarkdown(table)).toBe(
      "| a\\|b | `c` |\n| --- | --- |\n| `x \\| y` |  |\n| \\- | \\:- |",
    );
    expect(reload(table)).toEqual(table);
  });

  it("formats lists, quotes, callouts and rules", () => {
    const item = (...c: JSONContent[]) => ({ type: "listItem", content: c });
    const md = docToMarkdown(
      doc(
        TITLE,
        { type: "bulletList", content: [item(para(text("a")), { type: "bulletList", content: [item(para(text("b")))] })] },
        { type: "orderedList", attrs: { start: 9 }, content: [item(para(text("x"))), item(para(text("y")), para(text("z")))] },
        { type: "blockquote", content: [para(text("q1")), para(text("q2"))] },
        { type: "calloutBlock", attrs: { kind: "IMPORTANT" }, content: [para(text("c"))] },
        { type: "horizontalRule" },
        para(text("a"), { type: "hardBreak" }, text("b")),
      ),
    );
    expect(md).toBe(
      [
        "## T",
        "- a\n  - b",
        "9. x\n10. y\n\n    z",
        "> q1\n>\n> q2",
        "> [!IMPORTANT]\n> c",
        "---",
        "a\\\nb",
      ].join("\n\n"),
    );
  });

  it("adjacent lists alternate their markers so they stay separate", () => {
    const list = (type: string, t: string) => ({
      type,
      ...(type === "orderedList" ? { attrs: { start: 1 } } : {}),
      content: [{ type: "listItem", content: [para(text(t))] }],
    });
    const json = doc(
      TITLE,
      list("bulletList", "a"),
      list("bulletList", "b"),
      list("orderedList", "c"),
      list("orderedList", "d"),
    );
    const md = docToMarkdown(json);
    expect(md).toBe("## T\n\n- a\n\n* b\n\n1. c\n\n1) d");
    expect(markdownToDoc(md).doc).toEqual(json);
  });

  it("an empty synthetic title writes nothing; a filled one writes ## text", () => {
    const empty = { type: "heading", attrs: { level: 2 } };
    const synthetic = { syntheticTitle: true };
    expect(docToMarkdown(doc(empty, para(text("body"))), "", synthetic)).toBe("body");
    expect(docToMarkdown(doc(empty), "", synthetic)).toBe("");
    expect(
      docToMarkdown(doc({ ...empty, content: [text("New")] }, para(text("b"))), "", synthetic),
    ).toBe("## New\n\nb");
  });

  it("a genuine empty ## at the top survives (R15)", () => {
    const empty = { type: "heading", attrs: { level: 2 } };
    expect(docToMarkdown(doc(empty, para(text("body"))))).toBe("##\n\nbody");
    const source = "##\n\nbody";
    const loaded = markdownToDoc(source);
    expect(loaded.blocks[0].synthetic).toBeUndefined();
    expect(
      docToMarkdown(loaded.doc, loaded.definitions, {
        syntheticTitle: loaded.blocks[0]?.synthetic,
      }),
    ).toBe(source);
    // An NBSP-only title is not empty: it is not dropped as synthetic.
    const nbsp = { ...empty, content: [text("\u00a0")] };
    expect(docToMarkdown(doc(nbsp, para(text("b"))), "", { syntheticTitle: true })).toMatch(
      /^##/,
    );
  });

  it("posts without a ## title round-trip byte-for-byte", () => {
    const source = "# Big\n\ntext";
    const { doc: json, definitions, blocks } = markdownToDoc(source);
    expect(blocks[0].synthetic).toBe(true);
    expect(docToMarkdown(json, definitions, { syntheticTitle: true })).toBe(source);
  });

  describe("block boundaries (open, save, no edits)", () => {
    const resave = (source: string) => {
      const loaded = markdownToDoc(source);
      return docToMarkdown(loaded.doc, loaded.definitions, {
        syntheticTitle: loaded.blocks[0]?.synthetic,
      });
    };

    it("a raw loose list keeps the next list separate", () => {
      for (const source of [
        "## T\n\n- a\n\n  x\n\n* c",
        "## T\n\n1. a\n\n   x\n\n1) c",
        "## T\n\n* a\n\n  x\n\n- c",
      ]) {
        const loaded = markdownToDoc(source);
        expect(loaded.blocks.map((b) => b.raw), source).toEqual([false, true, false]);
        const out = resave(source);
        expect(parseArticle(out), source).toEqual(parseArticle(source));
      }
    });

    it("an editor list above a raw list of the same kind stays separate", () => {
      const item = (t: string) => ({ type: "listItem", content: [para(text(t))] });
      const json = doc(
        TITLE,
        { type: "bulletList", content: [item("b")] },
        { type: "rawBlock", attrs: { source: "- a\n\n  x" } },
      );
      const out = docToMarkdown(json);
      expect(out).toBe("## T\n\n* b\n\n- a\n\n  x");
      expect(markdownToDoc(out).doc).toEqual(json);
      const ordered = doc(
        TITLE,
        { type: "orderedList", attrs: { start: 1 }, content: [item("b")] },
        { type: "rawBlock", attrs: { source: "1. a\n\n   x" } },
      );
      expect(markdownToDoc(docToMarkdown(ordered)).doc).toEqual(ordered);
    });

    it("an ordered list squeezed between raw lists of both delimiters throws", () => {
      const json = doc(
        TITLE,
        { type: "rawBlock", attrs: { source: "1. a\n\n   x" } },
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [{ type: "listItem", content: [para(text("b"))] }],
        },
        { type: "rawBlock", attrs: { source: "1) c\n\n   y" } },
      );
      expect(() => docToMarkdown(json)).toThrow(UnserializableError);
    });

    it("an unclosed raw fence before an added paragraph throws, naming the block", () => {
      const json = doc(
        TITLE,
        { type: "rawBlock", attrs: { source: "```js {1}\nx" } },
        para(text("added")),
      );
      expect(() => docToMarkdown(json)).toThrow(UnserializableError);
      expect(() => docToMarkdown(json)).toThrow(/block 2\b/);
    });
  });

  it("ordered list numbers past 9 digits throw", () => {
    const items = [1, 2].map((n) => ({ type: "listItem", content: [para(text(`i${n}`))] }));
    expect(() =>
      blockToMarkdown({ type: "orderedList", attrs: { start: 999999999 }, content: items }),
    ).toThrow(UnserializableError);
    expect(
      blockToMarkdown({ type: "orderedList", attrs: { start: 999999998 }, content: items }),
    ).toBe("999999998. i1\n999999999. i2");
  });

  it("definitions are appended verbatim after the blocks", () => {
    const source = "## T\n\nSee [x][ref] and [y].\n\n[ref]: https://x.dev \"X\"\n\n[y]: /y";
    const loaded = markdownToDoc(source);
    expect(loaded.blocks.every((b) => !b.raw)).toBe(true);
    const out = docToMarkdown(loaded.doc, loaded.definitions);
    expect(out.endsWith('\n\n[ref]: https://x.dev "X"\n\n[y]: /y')).toBe(true);
    expect(parseArticle(out)).toEqual(parseArticle(source));
  });

  it("level-1 headings: empty and with an image", () => {
    expect(blockToMarkdown({ type: "heading", attrs: { level: 1 } })).toBe("#");
    const h1 = {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "image", attrs: { src: "/a.jpg", alt: "cover", title: null } }],
    };
    expect(blockToMarkdown(h1)).toBe("# ![cover](/a.jpg)");
    expect(reload(h1)).toEqual(h1);
  });

  it("rawBlock is written verbatim", () => {
    const source = "##### Small *raw*";
    expect(docToMarkdown(doc(TITLE, { type: "rawBlock", attrs: { source } }))).toBe(
      `## T\n\n${source}`,
    );
  });

  it("shapes this parser can't read back throw instead of changing", () => {
    // `~~a\~~~`: the closing `~~` is skipped next to any `~`.
    expect(() => blockToMarkdown(para(text("a~", [{ type: "strike" }])))).toThrow(
      UnserializableError,
    );
    // A 3-backtick code span at a line start is a fence opener.
    expect(() => blockToMarkdown(para(text("` ``", [{ type: "code" }])))).toThrow(
      UnserializableError,
    );
    expect(blockToMarkdown(para(text("x "), text("` ``", [{ type: "code" }])))).toBe(
      "x ``` ` `` ```",
    );
    // Link text with `]:` at a line start is a link-reference definition.
    const link = [{ type: "link", attrs: { href: "/a", title: null } }];
    expect(() => blockToMarkdown(para(text("a]: b", link)))).toThrow(UnserializableError);
    // Code can't span lines; a heading can't hold a line break.
    expect(() => blockToMarkdown(para(text("a\nb", [{ type: "code" }])))).toThrow(
      UnserializableError,
    );
    expect(() =>
      blockToMarkdown({
        type: "heading",
        attrs: { level: 2 },
        content: [text("a"), { type: "hardBreak" }, text("b")],
      }),
    ).toThrow(UnserializableError);
  });

  it("intraword bold and italic still round-trip", () => {
    const block = para(
      text("wor", [{ type: "bold" }]),
      text("d", [{ type: "bold" }, { type: "italic" }]),
      text("s"),
    );
    expect(reload(block)).toEqual(block);
  });

  it("tables need one header row on top", () => {
    const cell = (type: string) => ({ type, content: [para(text("x"))] });
    const table = (first: string, rest: string) => ({
      type: "table",
      content: [
        { type: "tableRow", content: [cell(first)] },
        { type: "tableRow", content: [cell(rest)] },
      ],
    });
    expect(() => blockToMarkdown(table("tableCell", "tableCell"))).toThrow(UnserializableError);
    expect(() => blockToMarkdown(table("tableHeader", "tableHeader"))).toThrow(
      UnserializableError,
    );
    expect(blockToMarkdown(table("tableHeader", "tableCell"))).toBe("| x |\n| --- |\n| x |");
  });

  it("links the parser would blank throw", () => {
    const link = (href: string) => [{ type: "link", attrs: { href, title: null } }];
    expect(() => blockToMarkdown(para(text("x", link("javascript:alert(1)"))))).toThrow(
      UnserializableError,
    );
    expect(blockToMarkdown(para(text("x", link("mailto:a@b.dev"))))).toBe("[x](mailto:a@b.dev)");
  });

  it("blanks the parser trims are not written", () => {
    expect(blockToMarkdown(para(text("  a  \n  b  ")))).toBe("a\nb");
    expect(
      blockToMarkdown({ type: "heading", attrs: { level: 2 }, content: [text(" a "), text(" ")] }),
    ).toBe("## a");
    expect(blockToMarkdown(para(text("a "), { type: "hardBreak" }, text(" b")))).toBe("a \\\nb");
  });

  it("unknown nodes and marks throw instead of being dropped", () => {
    expect(() => blockToMarkdown({ type: "mystery" })).toThrow(UnserializableError);
    expect(() =>
      blockToMarkdown(para(text("u", [{ type: "underline" }]))),
    ).toThrow(UnserializableError);
  });

  describe("escaping", () => {
    const cases: Array<[string, JSONContent]> = [
      ["inline markers", para(text("a*b_c `d` ~e~ [f] \\g ![h] _i_ snake_case"))],
      ["line-start block markers", para(text("# not a heading"))],
      ["line-start quote", para(text("> not a quote"))],
      ["line-start bullet", para(text("- not a list"))],
      ["line-start plus", para(text("+ not a list"))],
      ["line-start ordered", para(text("12. not a list"))],
      ["line-start ordered paren", para(text("3) not a list"))],
      ["line-start rule", para(text("---"))],
      ["line-start comment component", para(text('<!-- ::youtube id="x" -->'))],
      ["line-start definition", para(text("[x]: https://x.dev"))],
      ["callout marker in a quote", { type: "blockquote", content: [para(text("[!NOTE]"))] }],
      ["markers after a hard break", para(text("a"), { type: "hardBreak" }, text("- b"))],
      ["bang before a link", para(text("wow!"), text("x", [{ type: "link", attrs: { href: "/x", title: null } }]))],
      ["heading closing hashes", { type: "heading", attrs: { level: 3 }, content: [text("C #")] }],
      ["heading only hashes", { type: "heading", attrs: { level: 3 }, content: [text("##")] }],
      ["code span with backticks", para(text("a `` b", [{ type: "code" }]))],
      ["code span edge backtick", para(text("`x", [{ type: "code" }]))],
      ["code span padded", para(text(" x ", [{ type: "code" }]))],
      ["adjacent bold and italic", para(text("a", [{ type: "bold" }, { type: "italic" }]), text("b", [{ type: "bold" }]), text("c"))],
      ["italic then bold", para(text("a", [{ type: "italic" }]), text("b", [{ type: "bold" }]))],
      ["link title with parens style", para(text("a", [{ type: "link", attrs: { href: "/x", title: `"it's"` } }]))],
    ];
    for (const [name, block] of cases) {
      it(name, () => {
        expect(reload(block)).toEqual(block);
      });
    }
  });

  it("random inline content round-trips", () => {
    // Deterministic fuzz over the inline shapes the bridge can hold. Words
    // never start or end with whitespace (the parser trims each line).
    let seed = 0x5eed;
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
    const chars = "aZ1 *_~`[]!#>-+.)|:<\\(\"'";
    const word = () => {
      const w = Array.from({ length: 1 + Math.floor(rand() * 5) }, () => pick([...chars]))
        .join("")
        .trim();
      return w || "w";
    };
    const LINKS = [
      { type: "link", attrs: { href: "/a", title: null } },
      { type: "link", attrs: { href: "https://x.dev/(b)", title: "T" } },
    ];
    const ORDER = ["link", "bold", "code", "italic", "strike"];
    const normalize = (nodes: JSONContent[]) => {
      const out: JSONContent[] = [];
      for (const node of nodes) {
        const marks = node.marks
          ? [...node.marks].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
          : undefined;
        const n = marks?.length ? { ...node, marks } : { ...node, marks: undefined };
        if (!n.marks) delete n.marks;
        const last = out[out.length - 1];
        if (
          n.type === "text" &&
          last?.type === "text" &&
          JSON.stringify(last.marks ?? []) === JSON.stringify(n.marks ?? [])
        ) {
          out[out.length - 1] = { ...last, text: last.text! + n.text };
        } else out.push(n);
      }
      return out;
    };

    let checked = 0;
    let unserializable = 0;
    for (let n = 0; n < 2000; n++) {
      const nodes: JSONContent[] = [];
      const count = 1 + Math.floor(rand() * 6);
      for (let i = 0; i < count; i++) {
        const r = rand();
        if (r < 0.08 && i > 0 && i < count - 1 && nodes.at(-1)?.type !== "hardBreak") {
          nodes.push(
            rand() < 0.5 ? { type: "hardBreak" } : { type: "hardBreak", marks: [{ type: "bold" }] },
          );
          continue;
        }
        if (r < 0.14 && i > 0 && i < count - 1 && nodes.at(-1)?.text !== " ") {
          nodes.push(text(" "));
          continue;
        }
        let marks: { type: string; attrs?: Record<string, unknown> }[] = [];
        if (r < 0.25) {
          marks = [{ type: "code" }];
        } else {
          for (const m of ["bold", "italic", "strike"]) if (rand() < 0.3) marks.push({ type: m });
          if (rand() < 0.2) marks.unshift(pick(LINKS));
        }
        if (r > 0.92 && marks[0]?.type !== "code") {
          const image: JSONContent = {
            type: "image",
            attrs: { src: "/i.png", alt: word(), title: null },
          };
          if (marks.length) image.marks = marks;
          nodes.push(image);
          continue;
        }
        let w = rand() < 0.1 && marks[0]?.type !== "code" ? `${word()}\n${word()}` : word();
        // Known limit, tested separately: strikethrough can't end with `~`.
        if (marks.some((m) => m.type === "strike")) w = w.replace(/~+$/, "").trim() || "s";
        nodes.push(text(w, marks.length ? marks : undefined));
      }
      // A space next to a hard break or a paragraph edge is trimmed by the parser.
      const clean = nodes.filter(
        (node, i) =>
          !(
            node.type === "text" &&
            node.text === " " &&
            !node.marks &&
            (i === 0 || i === nodes.length - 1 ||
              nodes[i - 1].type === "hardBreak" || nodes[i + 1].type === "hardBreak")
          ),
      );
      const block = para(...clean);
      let md: string;
      try {
        md = blockToMarkdown(block);
      } catch (error) {
        // A few shapes have no Markdown form in this parser (e.g. strikethrough
        // ending in `~`, intraword bold+italic+strike tangles); saving stops.
        if (!(error instanceof UnserializableError)) throw error;
        unserializable++;
        continue;
      }
      const loaded = markdownToDoc(`## T\n\n${md}`, () => true);
      expect(loaded.blocks[1]?.raw, md).toBe(false);
      expect(loaded.doc.content, md).toHaveLength(2);
      expect(loaded.doc.content![1].content, md).toEqual(normalize(clean));
      checked++;
    }
    expect(checked + unserializable).toBe(2000);
    expect(unserializable).toBeLessThan(10);
  });
});
