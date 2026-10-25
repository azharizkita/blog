import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { splitTopLevelBlocks } from "@/lib/markdown/blocks";
import { parseArticle } from "@/lib/markdown/config";
import { convertLegacyMarkdown } from "@/lib/markdown/legacy";

function expectRejoin(source: string) {
  const { blocks, definitions } = splitTopLevelBlocks(source);
  const joined =
    blocks.map((b) => b.source).join("\n\n") +
    (definitions ? "\n\n" + definitions : "");
  expect(parseArticle(joined)).toEqual(parseArticle(source));
}

describe("splitTopLevelBlocks", () => {
  it("splits a mixed post", () => {
    const parts = [
      "# Title",
      "Some paragraph\nspanning two lines.",
      '<!-- ::apple-music url="u" -->',
      "```ts\nconst a = 1;\n\nconst b = 2;\n```",
      "> quote line 1\n> quote line 2",
    ];
    const { blocks } = splitTopLevelBlocks(parts.join("\n\n"));
    expect(blocks.map((b) => b.source)).toEqual(parts);
    for (const b of blocks) {
      expect(parseArticle(b.source).children[0]).toEqual(b.node);
    }
    expect(splitTopLevelBlocks(parts.join("\n\n")).definitions).toBe("");
  });

  it("returns nothing for empty input", () => {
    expect(splitTopLevelBlocks("\n\n")).toEqual({ blocks: [], definitions: "" });
  });

  const dir = join(__dirname, "../fixtures/posts");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  it.each(files)("fixture %s: blocks rejoin to the same AST", (file) => {
    const source = convertLegacyMarkdown(
      readFileSync(join(dir, file), "utf8"),
    ).content;
    expectRejoin(source);
  });

  it("keeps link reference definitions", () => {
    const src = "See [x][ref] here.\n\n[ref]: https://a.com \"T\"\n\nBye";
    const { blocks, definitions } = splitTopLevelBlocks(src);
    expect(blocks.map((b) => b.source)).toEqual(["See [x][ref] here.", "Bye"]);
    expect(definitions).toBe('[ref]: https://a.com "T"');
    expect(blocks[0].node).toEqual(parseArticle(src).children[0]);
    expectRejoin(src);
  });

  it("keeps footnote definitions with continuation lines", () => {
    const src = "Hi[^1] and[^2].\n\n[^1]: First\n    more text\n[^2]: Second\n\nEnd";
    const { blocks, definitions } = splitTopLevelBlocks(src);
    expect(blocks.map((b) => b.source)).toEqual(["Hi[^1] and[^2].", "End"]);
    expect(definitions).toBe("[^1]: First\n    more text\n\n[^2]: Second");
    expect(blocks[0].node).toEqual(parseArticle(src).children[0]);
    expectRejoin(src);
  });

  it("does not extract definitions inside fences", () => {
    const src = "```md\n[ref]: https://a.com\n[^1]: note\n```\n\ntext";
    const { blocks, definitions } = splitTopLevelBlocks(src);
    expect(definitions).toBe("");
    expect(blocks[0].source).toBe("```md\n[ref]: https://a.com\n[^1]: note\n```");
    expectRejoin(src);
  });

  it("splits adjacent blocks without blank lines", () => {
    const src = "# H\npara\n- a\n- b\ntext\n```js\nx\n```";
    const { blocks } = splitTopLevelBlocks(src);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.map((b) => b.source).join("\n")).toBe(src);
    expectRejoin(src);
  });

  it("does not treat a leading --- as frontmatter", () => {
    const types = parseArticle("---\n\na\n\n---\n\nb").children.map(
      (n) => n.type,
    );
    expect(types).toEqual(["thematicBreak", "paragraph", "thematicBreak", "paragraph"]);
  });
});
