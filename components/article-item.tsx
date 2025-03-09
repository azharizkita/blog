"use client";

import * as React from "react";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import parseEntry from "@/lib/parse-entry";
import TimeAgo from "./time-ago";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

interface PostEntryProps {
  createdAt: string;
  slug: string;
  pathname: string;
  type: string;
  entry: ReturnType<typeof parseEntry>;
}

export function ArticleItem({
  createdAt,
  entry,
  slug,
  pathname: _pathname,
  type: _type,
}: PostEntryProps) {
  const pathname = usePathname() ?? _pathname;
  const type = useSearchParams().get("type") ?? _type;

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
        href={`/articles/${slug}`}
        className="w-full flex flex-col gap-2 cursor-pointer"
      >
        <CardDescription className="text-xs">
          <TimeAgo time={createdAt} />
        </CardDescription>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary">{entry.type}</Badge>
          <h2 className="scroll-m-2 text-lg font-semibold tracking-tight first:mt-0 w-full">
            {entry.title}
          </h2>
        </CardTitle>
        <CardDescription>{entry.description}</CardDescription>
      </Link>
    );
  }

  return null;
}
