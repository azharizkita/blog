"use client";

import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

interface TimeAgoProps {
  time: string;
  updatedAt?: string;
  className?: string;
}

const formatTime = (dateString: string) =>
  Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));

const emptySubscribe = () => () => {};

/**
 * Formats on the client only (empty server snapshot) so the SSR HTML never
 * disagrees with the visitor's locale and timezone.
 */
function useLocalTime(value?: string) {
  return useSyncExternalStore(
    emptySubscribe,
    () => (value ? formatTime(value) : ""),
    () => "",
  );
}

export default function TimeAgo({ time, updatedAt, className }: TimeAgoProps) {
  const [mode, setMode] = useState<"published" | "updated">("published");

  const published = useLocalTime(time);
  const updated = useLocalTime(updatedAt);

  const canToggle = Boolean(updatedAt && updatedAt !== time);

  if (!published) {
    return <Skeleton className={cn("h-6 w-44 rounded-full", className)} />;
  }

  if (!canToggle) {
    return (
      <p className={cn("prose-muted flex h-6 items-center", className)}>
        <time dateTime={time}>{published}</time>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        setMode((prev) => (prev === "published" ? "updated" : "published"))
      }
      aria-live="polite"
      className={cn(
        "relative block h-6 w-full cursor-pointer overflow-hidden rounded-sm text-left",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        className,
      )}
    >
      <span
        aria-hidden={mode !== "published"}
        className={cn(
          "prose-muted absolute inset-y-0 left-0 flex items-center gap-1 underline underline-offset-4 transition-all duration-300",
          mode === "published"
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0",
        )}
      >
        <time dateTime={time}>{published}</time>
      </span>

      <span
        aria-hidden={mode !== "updated"}
        className={cn(
          "prose-muted absolute inset-y-0 left-0 flex items-center gap-1 underline underline-offset-4 transition-all duration-300",
          mode === "updated"
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0",
        )}
      >
        Updated at <time dateTime={updatedAt}>{updated}</time>
      </span>
    </button>
  );
}
