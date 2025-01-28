"use client";

import * as React from "react";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import parseEntry from "@/lib/parse-entry";
import TimeAgo from "./time-ago";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

interface PostEntryProps {
  description: string;
  createdAt: string;
  slug: string;
  entry: ReturnType<typeof parseEntry>;
}

export function ArticleItem({ createdAt, entry, slug }: PostEntryProps) {
  const pathname = usePathname();
  const type = useSearchParams().get("type");

  if (type && type !== entry.type) return null;

  if (pathname === "/beeps") {
    return (
      <div className="flex flex-col gap-1">
        <div className="w-fit flex flex-col gap-2 bg-[#26252A] p-4 rounded-xl">
          <CardDescription className="text-white">
            {entry.description}
          </CardDescription>
        </div>
        <CardDescription className="text-xs pl-3">
          <TimeAgo time={createdAt} />
        </CardDescription>
      </div>
    );
  }

  if (entry.type !== "Beep") {
    return (
      <Link
        href={`/article/${slug}`}
        className="w-full flex flex-col gap-2 cursor-pointer"
      >
        <CardDescription className="text-xs">
          <TimeAgo time={createdAt} />
        </CardDescription>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary">{entry.type}</Badge> {entry.title}
        </CardTitle>
        <CardDescription>{entry.description}</CardDescription>
      </Link>
    );
  }

  return null;
}
