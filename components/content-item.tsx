import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TimeAgo from "@/components/time-ago";
import { ChevronRight } from "lucide-react";
import type { GistList } from "@/repositories/gist";

interface ContentItemProps {
  content: GistList[0];
  variant: "article" | "beep";
  showTypeFilter?: boolean;
}

export default function ContentItem({
  content,
  variant,
  showTypeFilter = false
}: ContentItemProps) {
  if (variant === "beep") {
    return (
      <div className="flex flex-col gap-1 w-fit">
        <Card className="py-4 bg-secondary">
          <CardContent className="px-4">
            <CardDescription className="text-foreground">
              {content.entry.description}
            </CardDescription>
          </CardContent>
        </Card>
        <CardDescription className="text-xs pl-3">
          <TimeAgo compact time={content.created_at} />
        </CardDescription>
      </div>
    );
  }

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-0 px-4">
        <CardTitle className="flex items-center gap-2">
          {showTypeFilter && (
            <Badge variant="secondary" asChild className="cursor-pointer">
              <Link href={`/articles?type=${content.entry.type}`}>
                {content.entry.type}
              </Link>
            </Badge>
          )}
          <h2 className="scroll-m-2 text-lg font-semibold tracking-tight first:mt-0 w-full">
            {content.entry.title}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <CardDescription className="!line-clamp-2">
          {content.entry.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex w-full grow px-4 gap-4 justify-between">
        <CardDescription className="text-xs flex grow">
          <TimeAgo
            compact
            time={content.created_at}
            updatedAt={content.updated_at}
          />
        </CardDescription>
        <Button
          asChild
          variant="link"
          className="cursor-pointer gap-1 justify-center items-center !p-0"
        >
          <Link href={`/articles/${content.slug}`}>
            Read more <ChevronRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}