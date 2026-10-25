import { describe, expect, it } from "vitest";
import { decodeAttribute, encodeAttribute } from "@/lib/markdown/attributes";

describe("attribute encoding", () => {
  it.each(['He said "hi" & left\nnext', "a --> b", ""])(
    "round-trips %j",
    (s) => {
      const enc = encodeAttribute(s);
      expect(enc).not.toMatch(/"|\n|-->/);
      expect(decodeAttribute(enc)).toBe(s);
    },
  );
});
