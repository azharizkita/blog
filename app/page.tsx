import ArticleContent from "@/components/article-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

const content = `
## Hi there.

Think of Silenced as a personal archive of my mind—from life updates, late-night thoughts, random realizations, or just rants about whatever’s on my plate. It’s not for everyone, but if you’re here, maybe you’ll find something that resonates.

Read, scroll, lurk, or leave—it’s up to you.
`;

export const metadata: Metadata = {
  description:
    "Think of Silenced as a personal archive of my mind—from life updates, late-night thoughts, random realizations, or just rants about whatever’s on my plate",
};

export default function Page() {
  return (
    <div className="flex h-full flex-col flex-grow gap-4">
      <Card>
        <CardContent className="p-6">
          <ArticleContent content={content} />
        </CardContent>
        <CardFooter className="flex w-full grow flex-col gap-4">
          <p className="leading-7 text-muted-foreground">
            So, what are you looking for?
          </p>
          <div className="flex gap-4 grow w-full">
            <Button asChild className="flex grow">
              <Link href="articles">Articles</Link>
            </Button>
            <Button asChild className="flex grow">
              <Link href="beeps">Beeps</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
