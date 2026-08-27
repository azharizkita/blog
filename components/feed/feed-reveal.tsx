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
  // last VISIBLE one — the true last child may be `hidden`. `divide-y`
  // sidesteps that entirely: it puts a top border on every child but the
  // first, so the border between the last visible row and the first hidden
  // one belongs to the (non-rendered, `display:none`) hidden row and never
  // paints — the last visible row always reads with no trailing hairline,
  // with no index math needed.
  return (
    <div className="divide-y">
      {rows.map((row, index) => (
        <div key={index} className={cn(index >= visible && "hidden")}>
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
