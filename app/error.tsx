"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the failure in monitoring; the boundary UI hides it otherwise.
    console.error(error);
  }, [error]);

  return (
    <Empty className="my-8 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Something went sideways</EmptyTitle>
        <EmptyDescription>
          This page couldn&apos;t load right now. It usually means the data
          source is temporarily unavailable or rate-limited. Give it a moment
          and try again.
        </EmptyDescription>
        {error.digest ? (
          <EmptyDescription className="font-mono text-xs">
            Reference: {error.digest}
          </EmptyDescription>
        ) : null}
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" render={<Link href="/">Go home</Link>} />
        </div>
      </EmptyContent>
    </Empty>
  );
}
