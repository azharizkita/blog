import { describe, expect, it } from "vitest";
import { unknownComponentDiagnostics } from "@/components/editor/source-lint";

describe("unknownComponentDiagnostics", () => {
  it("flags an unknown component with its 1-based line", () => {
    expect(
      unknownComponentDiagnostics('a\n\n<!-- ::spotify id="x" -->'),
    ).toEqual([{ line: 3, name: "spotify" }]);
  });

  it("ignores known components", () => {
    const src = '<!-- ::youtube id="x" -->\n\n<!-- ::envelope text="hi" -->';
    expect(unknownComponentDiagnostics(src)).toEqual([]);
  });

  it("ignores lines inside fences", () => {
    const src = 'text\n\n```md\n<!-- ::spotify id="x" -->\n```\n';
    expect(unknownComponentDiagnostics(src)).toEqual([]);
  });

  it("reports every unknown occurrence, outside fences only", () => {
    const src =
      '<!-- ::foo -->\n\n```\n<!-- ::bar -->\n```\n\n<!-- ::foo a="1" -->';
    expect(unknownComponentDiagnostics(src)).toEqual([
      { line: 1, name: "foo" },
      { line: 7, name: "foo" },
    ]);
  });
});
