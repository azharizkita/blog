"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

interface TimeAgoProps {
  time: string;
  className?: string;
  updatedAt?: string;
  compact?: boolean;
}

export default function TimeAgo({
  time: _time,
  className,
  updatedAt: _updatedAt,
  compact = false,
}: TimeAgoProps) {
  const [time, setTime] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [mode, setMode] = useState<"time" | "updated-at">("time");

  const toggleDisplay = () => {
    if (!updatedAt || !time || _time === _updatedAt) return;
    setMode((prev) => (prev === "time" ? "updated-at" : "time"));
  };

  useEffect(() => {
    if (_time) {
      const formattedTime = Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(_time));
      setTime(formattedTime);
    }

    if (_updatedAt) {
      const formattedTime = Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(_updatedAt));
      setUpdatedAt(formattedTime);
    }
  }, [_time, _updatedAt]);

  const compactness = compact ? "h-5 text-sm" : "h-6 text-base";

  return (
    <time
      dateTime={_time}
      className={cn(
        "relative flex shrink-0 w-full overflow-hidden",
        compactness,
        className
      )}
    >
      <span
        onClick={toggleDisplay}
        className={cn(
          "min-w-44 absolute flex w-fit shrink-0 transition-all duration-300",
          compactness,
          mode === "time"
            ? "translate-y-0 z-10"
            : "-translate-y-full z-0 opacity-0",
          _time !== _updatedAt &&
            _updatedAt &&
            "cursor-pointer underline underline-offset-4"
        )}
      >
        {time || (
          <Skeleton
            className={cn("w-full min-w-44 rounded-full", compactness)}
          />
        )}
      </span>

      <span
        onClick={toggleDisplay}
        className={cn(
          "absolute flex w-fit shrink-0 transition-all duration-300 underline underline-offset-4",
          compactness,
          mode === "updated-at"
            ? "translate-y-0 z-10"
            : "translate-y-full z-0 opacity-0",
          "cursor-pointer"
        )}
      >
        Updated at {_time !== _updatedAt ? updatedAt : "-"}
      </span>
    </time>
  );
}
