import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { splitTopLevelBlocks } from "@/lib/markdown/blocks";
import { parseArticle } from "@/lib/markdown/config";
import { convertLegacyMarkdown } from "@/lib/markdown/legacy";

describe("splitTopLevelBlocks", () => {
  it("splits a mixed post", () => {
    const parts = [
      "# Title",
      "Some paragraph\nspanning two lines.",
      '<!-- ::apple-music url="u" -->',
      "```ts\nconst a = 1;\n\nconst b = 2;\n```",
      "> quote line 1\n> quote line 2",
    ];
    const blocks = splitTopLevelBlocks(parts.join("\n\n"));
    expect(blocks.map((b) => b.source)).toEqual(parts);
    for (const b of blocks) {
      expect(parseArticle(b.source).children[0]).toEqual(b.node);
    }
  });

  it("returns nothing for empty input", () => {
    expect(splitTopLevelBlocks("\n\n")).toEqual([]);
  });

  const dir = join(__dirname, "../fixtures/posts");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  it.each(files)("fixture %s: blocks rejoin to the same AST", (file) => {
    const source = convertLegacyMarkdown(
      readFileSync(join(dir, file), "utf8"),
    ).content;
    const blocks = splitTopLevelBlocks(source);
    expect(
      parseArticle(blocks.map((b) => b.source).join("\n\n")),
    ).toEqual(parseArticle(source));
  });
});
