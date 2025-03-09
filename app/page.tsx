import ArticleContent from "@/components/article-content";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";

const content = `
## Hi there.

Think of Silenced as a personal archive of my mind—from life updates, late-night thoughts, random realizations, or just rants about whatever’s on my plate. It’s not for everyone, but if you’re here, maybe you’ll find something that resonates.

Read, scroll, lurk, or leave—it’s up to you.
`;

export const metadata: Metadata = {
  description:
    "Think of Silenced as a personal archive of my mind—from life updates, late-night thoughts, random realizations, or just rants about whatever’s on my plate",
};

export default async function Page() {

  return (
    <div className="flex h-full flex-col flex-grow mt-[-160px] justify-center gap-4">
      <ArticleContent content={content} withBackNavigation />

      <div className="flex gap-2 flex-col w-full justify-end items-center pt-4">
        <p className="leading-7 text-gray-400">What are you looking for?</p>
        <div className="flex w-full gap-4">
          <Button asChild className="w-full">
            <Link href="articles">Articles</Link>
          </Button>
          <Button asChild className="w-full">
            <Link href="beeps">Beeps</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
