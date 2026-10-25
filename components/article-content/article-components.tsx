import type { ReactNode } from "react";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import Mermaid from "@/components/mermaid";
import { AppleMusic } from "@/components/apple-music-embed";
import { Envelope } from "@/components/lottie/envelope";
import { YouTube } from "@/components/youtube-embed";
import { cn } from "@/lib/utils";

/**
 * Aside box for notes/warnings/tips inside articles. Neutral-token styling —
 * only the icon carries semantic color.
 */
const CALLOUT_VARIANTS = {
  note: { icon: Info, iconClass: "text-accent-link" },
  tip: { icon: Lightbulb, iconClass: "text-primary" },
  warn: { icon: TriangleAlert, iconClass: "text-destructive" },
} as const;

function Callout({
  type = "note",
  children,
}: {
  type?: keyof typeof CALLOUT_VARIANTS;
  children: ReactNode;
}) {
  const variant = CALLOUT_VARIANTS[type] ?? CALLOUT_VARIANTS.note;
  const Icon = variant.icon;
  return (
    <aside className="flex gap-3 rounded-md border bg-muted/40 px-4 py-3">
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-4 flex-none", variant.iconClass)}
      />
      <div className="prose-p min-w-0 [&>p]:m-0">{children}</div>
    </aside>
  );
}

/**
 * Emitted component tags -> React components. Only tags produced by
 * lib/markdown/extensions.ts reach here, which keeps article content on a
 * whitelist; unknown comment components (`md-unknown`) render nothing.
 */
export const articleComponents = {
  "md-apple-music": AppleMusic,
  "md-envelope": Envelope,
  "md-mermaid": Mermaid,
  "md-callout": Callout,
  "md-youtube": YouTube,
  "md-unknown": () => null,
};
