import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appliedExactlyOnce,
  assertChangedSet,
  EMPTY_HEADING_SLUGS,
  EXPECTED_CHANGED,
  lineDiff,
  readingTime,
  stripTrailingEmptyHeadings,
} from "../scripts/migrate-content-lib";
import { convertLegacyMarkdown } from "@/lib/markdown/legacy";

describe("assertChangedSet", () => {
  it("accepts the expected set, any subset, or none", () => {
    expect(assertChangedSet([...EXPECTED_CHANGED].reverse())).toBeNull();
    expect(assertChangedSet(["21-guns"])).toBeNull();
    expect(assertChangedSet([])).toBeNull();
  });
  it("rejects slugs outside the set and duplicates", () => {
    expect(assertChangedSet([...EXPECTED_CHANGED, "other"])).toMatch(/unexpected: \[other\]/);
    expect(assertChangedSet(["21-guns", "21-guns"])).toMatch(/duplicates: \[21-guns\]/);
  });
});

describe("helpers", () => {
  it("readingTime is at least 1 and ceil(words/275)", () => {
    expect(readingTime("")).toBe(1);
    expect(readingTime("w ".repeat(276))).toBe(2);
  });
  it("lineDiff shows only changes with context", () => {
    const d = lineDiff("a\nb\nc\nd\ne\nf\ng\nh", "a\nb\nc\nX\ne\nf\ng\nh", 1);
    expect(d).toBe("  c\n- d\n+ X\n  e");
  });
});

describe("appliedExactlyOnce", () => {
  it("needs one row from each statement", () => {
    expect(appliedExactlyOnce([[{ id: "a" }], [{ id: "a" }]])).toBe(true);
    expect(appliedExactlyOnce([[], []])).toBe(false);
    expect(appliedExactlyOnce([[{ id: "a" }], []])).toBe(false);
    expect(appliedExactlyOnce([[{ id: "a" }]])).toBe(false);
  });
});

describe("stripTrailingEmptyHeadings", () => {
  it("drops empty headings at the end with the blank lines before them", () => {
    expect(stripTrailingEmptyHeadings("text\n\n# ")).toBe("text");
    expect(stripTrailingEmptyHeadings("text\n\n#\n\n## \n")).toBe("text");
  });
  it("leaves real headings, mid-post empty headings and other endings alone", () => {
    for (const md of ["text\n\n# Real", "a\n\n#\n\nmore", "a #", "text\n", "#"]) {
      expect(stripTrailingEmptyHeadings(md)).toBe(md === "#" ? "" : md);
    }
  });
  it("changes exactly the expected fixtures, with converted legacy posts", () => {
    const dir = join(__dirname, "fixtures/posts");
    const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8")) as { slug: string }[];
    const changed = index
      .map(({ slug }) => ({ slug, source: readFileSync(join(dir, `${slug}.md`), "utf8") }))
      .filter(({ source }) => stripTrailingEmptyHeadings(convertLegacyMarkdown(source).content) !== source)
      .map(({ slug }) => slug)
      .sort();
    expect(changed).toEqual([...EXPECTED_CHANGED]);
    expect(EXPECTED_CHANGED).toEqual(expect.arrayContaining([...EMPTY_HEADING_SLUGS]));
  });
});
