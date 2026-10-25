import { describe, expect, it } from "vitest";
import {
  CONTENT_FILENAME,
  getContentFile,
} from "@/lib/gist-file";

describe("gist-file", () => {
  const f = { content: "mdx" };
  const g = { content: "md" };

  it("writes index.md", () => {
    expect(CONTENT_FILENAME).toBe("index.md");
  });

  it("falls back to index.mdx", () => {
    expect(getContentFile({ "index.mdx": f })?.file).toBe(f);
  });

  it("prefers index.md over index.mdx", () => {
    expect(getContentFile({ "index.md": g, "index.mdx": f })?.file).toBe(g);
  });
});
