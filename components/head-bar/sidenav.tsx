import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import {
  ChartColumn,
  ChevronsUpDown,
  Link2,
  Menu,
  MessageCircle,
  Newspaper,
  UserRound,
} from "lucide-react";
import { getGistList } from "@/repositories/gist";
import { Collapsible, CollapsibleTrigger } from "../ui/collapsible";
import { CollapsibleContent } from "@radix-ui/react-collapsible";

export async function Sidenav() {
  const beeps = await getGistList("beeps");
  const articles = await getGistList("articles");
  return (
    <Sheet>
      <SheetTrigger asChild className="cursor-pointer">
        <Button
          variant="outline"
          className="top-4 left-0 absolute h-[42px] w-[42px] block"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>
            <SheetTrigger asChild>
              <Link href="/">
                <div className="flex flex-col gap-0 items-center">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Silenced
                  </h1>
                  <h1 className="text-sm tracking-tight text-primary -mt-2">
                    personal dumps
                  </h1>
                </div>
              </Link>
            </SheetTrigger>
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 overflow-y-auto">
          <nav className="flex flex-col overflow-y-auto">
            <Collapsible>
              <CollapsibleTrigger asChild className="w-full flex justify-start">
                <Button
                  variant="link"
                  size="sm"
                  className="!p-0 font-bold cursor-pointer text-foreground"
                >
                  <Newspaper />
                  <SheetTrigger asChild>
                    <Link href="/articles">Articles ({articles.length})</Link>
                  </SheetTrigger>
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 ml-3 flex flex-col">
                {articles.map(({ entry, slug }) => (
                  <SheetTrigger asChild key={slug}>
                    <Link href={`/articles/${slug}`}>
                      <Button
                        variant="link"
                        className="w-fit !p-0 text-foreground cursor-pointer"
                      >
                        <Link2 />
                        {entry.title}
                      </Button>
                    </Link>
                  </SheetTrigger>
                ))}
              </CollapsibleContent>
            </Collapsible>
            <SheetTrigger asChild>
              <Link href="/beeps">
                <Button
                  variant="link"
                  className="w-fit !p-0 cursor-pointer text-foreground font-bold"
                >
                  <MessageCircle />
                  Beeps ({beeps.length})
                </Button>
              </Link>
            </SheetTrigger>
            <SheetTrigger asChild>
              <Link href="/stats">
                <Button
                  variant="link"
                  className="w-fit !p-0 cursor-pointer text-foreground font-bold"
                >
                  <ChartColumn />
                  Stats
                </Button>
              </Link>
            </SheetTrigger>
            <SheetTrigger asChild>
              <Link href="/who-am-i">
                <Button
                  variant="link"
                  className="w-fit !p-0 cursor-pointer text-foreground font-bold"
                >
                  <UserRound />
                  Me
                </Button>
              </Link>
            </SheetTrigger>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
