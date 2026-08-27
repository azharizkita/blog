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
  // Divider adaptation: all rows stay in the DOM (SEO), so a CSS-only
  // `last:border-b-0` on the row itself can't tell which row is the last
  // VISIBLE one — the true last child may be `hidden`. Instead the border
  // lives on this wrapper div and is computed here, from `visible`/`total`,
  // so only the last row the visitor can actually see loses its hairline.
  const lastVisibleIndex = Math.min(visible, total) - 1;
  return (
    <div>
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn(
            index >= visible && "hidden",
            index < lastVisibleIndex && "border-b",
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
