import { linter, type Diagnostic } from "@codemirror/lint";
import { parseArticle } from "@/lib/markdown/config";
import { ARTICLE_COMPONENTS } from "@/lib/markdown/extensions";

const COMPONENT_LINE = /^\s{0,3}<!--\s*::([A-Za-z][\w-]*)/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

function unknownNames(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  const n = node as {
    tagName?: string;
    properties?: { name?: string };
    children?: unknown[];
  };
  if (n.tagName === "md-unknown" && typeof n.properties?.name === "string") {
    out.add(n.properties.name);
  }
  if (Array.isArray(n.children)) for (const c of n.children) unknownNames(c, out);
}

/**
 * Unknown `<!-- ::name … -->` component lines. The parser decides which names
 * are unknown (its AST carries no positions); lines are located by scanning
 * the source outside code fences. Lines are 1-based.
 */
export function unknownComponentDiagnostics(
  source: string,
): Array<{ line: number; name: string }> {
  if (!source.includes("::")) return [];
  const unknown = new Set<string>();
  unknownNames(parseArticle(source), unknown);
  if (unknown.size === 0) return [];

  const found: Array<{ line: number; name: string }> = [];
  let fence: { char: string; len: number } | null = null;
  source.split("\n").forEach((text, i) => {
    const f = FENCE.exec(text);
    if (fence) {
      if (
        f &&
        f[1][0] === fence.char &&
        f[1].length >= fence.len &&
        text.trim() === f[1]
      ) {
        fence = null;
      }
      return;
    }
    if (f) {
      fence = { char: f[1][0], len: f[1].length };
      return;
    }
    const m = COMPONENT_LINE.exec(text);
    if (m && unknown.has(m[1])) found.push({ line: i + 1, name: m[1] });
  });
  return found;
}

const KNOWN = Object.keys(ARTICLE_COMPONENTS).join(", ");

export const sourceLinter = linter((view): Diagnostic[] => {
  const doc = view.state.doc;
  return unknownComponentDiagnostics(doc.toString()).map(({ line, name }) => {
    const l = doc.line(line);
    return {
      from: l.from,
      to: l.to,
      severity: "warning",
      message: `Unknown component ::${name} — kept exactly as written and shown as a locked block in Write mode. Known: ${KNOWN}.`,
    };
  });
});
