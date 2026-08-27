"use client";

import { Children, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeedReveal({
  children,
  pageSize,
  total,
}: {
  children: React.ReactNode;
  pageSize: number;
  total: number;
}) {
  const [visible, setVisible] = useState(pageSize);
  const rows = Children.toArray(children);
  // Divider adaptation: all rows stay in the DOM (SEO), so a plain
  // `border-b last:border-b-0` on the row itself can't tell which row is the
  // last VISIBLE one — the true last child may be `hidden`. `divide-y` alone
  // doesn't fix this either under this repo's Tailwind v4 (verified in
  // node_modules/tailwindcss/dist/lib.js): its selector is
  // `:where(& > :not(:last-child))` applying `border-bottom-width`, i.e. a
  // bottom border on every child except the structurally LAST DOM child —
  // not the last visible one. Whenever Load More renders (`visible < total`),
  // that structurally-last child is either a hidden row or the Load More
  // button div (both live inside this same `divide-y` container), so the
  // last *visible* row still gets a border-bottom and a stray hairline shows
  // above the hidden rows / the button. Fix: explicitly cancel the border on
  // the last visible row's wrapper with `border-b-0` — `:where()` carries
  // zero specificity, so a plain utility class on the element always wins
  // over the `divide-y`-generated rule regardless of source order.
  const lastVisibleIndex = Math.min(visible, total) - 1;
  return (
    <div className="divide-y">
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn(
            index >= visible && "hidden",
            index === lastVisibleIndex && "border-b-0",
          )}
        >
          {row}
        </div>
      ))}
      {visible < total && (
        <div className="flex justify-center pt-8">
          <Button variant="outline" onClick={() => setVisible((v) => v + pageSize)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
