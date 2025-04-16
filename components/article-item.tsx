"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TimeAgo from "@/components/time-ago";
import parseEntry from "@/lib/parse-entry";
import { Button } from "./ui/button";
import { ChevronRight } from "lucide-react";

interface ArticleItemProps {
  createdAt: string;
  updatedAt: string;
  slug: string;
  entry: ReturnType<typeof parseEntry>;
}

export default function ArticleItem({
  createdAt,
  updatedAt,
  slug,
  entry,
}: ArticleItemProps) {
  const type = useSearchParams().get("type");

  if (type && type !== entry.type) return null;

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-0 px-4">
        <CardTitle className="flex items-center gap-2">
          <Badge variant="secondary" asChild className="cursor-pointer">
            <Link href={`/articles?type=${entry.type}`}>{entry.type}</Link>
          </Badge>
          <h2 className="scroll-m-2 text-lg font-semibold tracking-tight first:mt-0 w-full">
            {entry.title}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <CardDescription className="!line-clamp-2">
          {entry.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex w-full grow px-4 gap-4 justify-between">
        <CardDescription className="text-xs flex grow">
          <TimeAgo compact time={createdAt} updatedAt={updatedAt} />
        </CardDescription>
        <Button
          asChild
          variant="link"
          className="cursor-pointer gap-1 justify-center items-center !p-0"
        >
          <Link href={`/articles/${slug}`}>
            Read more <ChevronRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
