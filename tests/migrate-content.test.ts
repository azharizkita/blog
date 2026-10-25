import { describe, expect, it } from "vitest";
import { appliedExactlyOnce, assertChangedSet, EXPECTED_CHANGED, lineDiff, readingTime } from "../scripts/migrate-content-lib";

describe("assertChangedSet", () => {
  it("accepts exactly the expected four, or none", () => {
    expect(assertChangedSet([...EXPECTED_CHANGED].reverse())).toBeNull();
    expect(assertChangedSet([])).toBeNull();
  });
  it("rejects missing, extra and duplicate slugs", () => {
    expect(assertChangedSet(["21-guns"])).toMatch(/missing/);
    expect(assertChangedSet([...EXPECTED_CHANGED, "other"])).toMatch(/unexpected: \[other\]/);
    expect(assertChangedSet([...EXPECTED_CHANGED, "21-guns"])).not.toBeNull();
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
