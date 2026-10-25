import { describe, expect, it } from "vitest";
import { EXPECTED_CHANGED } from "../../scripts/migrate-content-lib";
import { applyLegacyShim, LEGACY_POST_IDS } from "@/lib/markdown/legacy-shim";

const LEGACY = '<Callout type="tip">\nHello\n</Callout>';
const NEW_STYLE = "- item\n\n  ```js\n  const a = 1;\n  ```\n\nliteral <strong>x</strong> and <em>y</em>";

describe("applyLegacyShim", () => {
  it("converts the four gated ids", () => {
    for (const id of Object.keys(LEGACY_POST_IDS)) {
      const out = applyLegacyShim(id, LEGACY);
      expect(out).not.toBe(LEGACY);
      expect(out).toContain("[!TIP]");
    }
  });
  it("returns any other id byte-identical, even legacy-looking content", () => {
    expect(applyLegacyShim("other", NEW_STYLE)).toBe(NEW_STYLE);
    expect(applyLegacyShim("other", LEGACY)).toBe(LEGACY);
  });
  it("shares the migration script's slug set", () => {
    expect([...Object.values(LEGACY_POST_IDS)].sort()).toEqual([...EXPECTED_CHANGED].sort());
    expect(Object.keys(LEGACY_POST_IDS)).toHaveLength(4);
  });
});
