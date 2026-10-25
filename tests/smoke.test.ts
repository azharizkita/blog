import { expect, test } from "vitest";
import { parseMarkdown } from "@tanstack/markdown/parser";

test("TanStack Markdown parses a heading", () => {
  expect(parseMarkdown("# a").children[0].type).toBe("heading");
});
