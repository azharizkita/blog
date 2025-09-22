import ArticleContent from "@/components/article-content";
import StatsChart from "@/components/stats-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { getPinnedRepos } from "@/repositories/pinned-repos";
import { createPageMetadata } from "@/lib/metadata";
import { SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";

export const metadata = createPageMetadata({
  title: "Stats",
  description: "If you've scrolled this far, I guess you're a little curious. So here's a peek into how I write code—and the languages I've used the most.",
  path: "/stats"
});

const topContent = `
## Personal Stats

If you've scrolled this far, I guess you're a little curious. So here’s a peek into how I write code—and the languages I’ve used the most.

### Stats

Only showing my top 6 languages here (1 byte = 1 character, yeah). I’ve excluded PHP and Blade—they were part of my past life. Moved on 😌
`;

const pinnedContent = `
### My favorite repos

A few repos I genuinely enjoy building. If something feels off, open a PR. I don’t bite.
`;

export default async function Stats() {
  const repos = await getPinnedRepos();
  return (
    <>
      <ArticleContent content={topContent} />
      <StatsChart />
      <ArticleContent content={pinnedContent} />
      <div className="grid auto-rows-min gap-4">
        {repos.map(({ url, description, name }) => (
          <Card key={url}>
            <CardContent className="gap-2 flex flex-col">
              <CardTitle>
                <Link href={url} target="_blank">
                  <Button
                    variant="link"
                    className="!p-0 text-foreground cursor-pointer"
                  >
                    <SquareArrowOutUpRight />
                    {name}
                  </Button>
                </Link>
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
