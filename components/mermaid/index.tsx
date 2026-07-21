"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";

interface MermaidProps {
  chart: string;
  /** Reserved box height in px, from the ```mermaid height=NNN fence meta. */
  height?: string;
}

const DEFAULT_HEIGHT = 320;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 1200;

/**
 * Renders a mermaid diagram in the browser. The mermaid library is imported
 * dynamically on mount, so it's a separate chunk fetched only on pages that
 * actually contain a diagram.
 *
 * The outer box height is fixed from the server render onward (default or
 * fence-meta hint), so swapping the source fallback for the SVG never shifts
 * the layout (CLS = 0). Diagrams taller than the box scroll inside it; the
 * height hint lets authors size the box to the diagram exactly.
 */
export default function Mermaid({ chart, height }: MermaidProps) {
  const { resolvedTheme } = useTheme();
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  const parsedHeight = Number(height);
  const boxHeight = Number.isFinite(parsedHeight)
    ? Math.min(Math.max(parsedHeight, MIN_HEIGHT), MAX_HEIGHT)
    : DEFAULT_HEIGHT;

  useEffect(() => {
    // next-themes resolves the theme after mount; wait so the first render
    // already uses the correct palette.
    if (!resolvedTheme) return;

    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "neutral",
          fontFamily: "var(--font-sans)",
          // Allow <br> in node labels for multi-line annotations. Strict
          // still sanitizes the diagram definition itself.
          flowchart: { htmlLabels: true },
        });

        // mermaid.render needs a valid CSS id; useId emits ":" characters.
        const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9-]/g, "")}`;
        const result = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(result.svg);
          setFailed(false);
        }
      } catch {
        // Bad diagram syntax in a gist must never blank out the article;
        // keep showing the source instead.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme, reactId]);

  return (
    // Bordered like the site's code blocks so a diagram taller than the box
    // reads as a scrollable panel, not a clipped rendering bug.
    <div
      style={{ height: boxHeight }}
      className="flex flex-col overflow-auto rounded-md border"
    >
      {svg && !failed ? (
        <div
          role="img"
          aria-label="Diagram"
          className="my-auto w-full p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <>
          {/* The wrapper already draws the code-block frame; flatten the
              global pre styling so borders don't nest. */}
          <pre className="flex-1 rounded-none border-0 bg-transparent">
            <code className="block px-4">{chart}</code>
          </pre>
          {failed ? (
            <p className="prose-muted px-4 pb-2">
              This diagram couldn&apos;t be rendered; its source is shown
              above.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
