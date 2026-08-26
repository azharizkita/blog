"use client";

import { useState, useTransition } from "react";
import { triggerRebuild } from "@/app/editor/actions";
import { Button } from "@/components/ui/button";

export function RebuildButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="flex items-center gap-2">
      {message && <span className="prose-muted text-xs">{message}</span>}
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await triggerRebuild();
            setMessage(result.message);
          })
        }
      >
        Rebuild site
      </Button>
    </span>
  );
}
