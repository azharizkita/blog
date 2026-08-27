"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Abort (user closed the sheet) or clipboard denial — do nothing.
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={share}>
      {copied ? <Check /> : <Share2 />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
