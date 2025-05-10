"use client";

import * as React from "react";
import { ChartColumn, MessageCircle, Search, UserRound } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { GistList } from "@/repositories/gist";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchContentProps {
  articles: GistList;
}

export default function SearchContent(props: SearchContentProps) {
  const { articles } = props;
  const [open, setOpen] = React.useState(false);
  const { push } = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="h-[42px] w-[42px]"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type to search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Articles">
            {articles.map(({ slug, entry }) => {
              const _url = `/articles/${slug}`;
              const handleOnSelect = () => {
                push(_url);
                setOpen(false);
              };

              return (
                <CommandItem
                  key={slug}
                  className="flex-col cursor-pointer"
                  asChild
                  onSelect={handleOnSelect}
                  value={slug}
                >
                  <Link href={_url}>
                    <div className="flex gap-2 items-center self-start">
                      <Badge variant="secondary">{entry.type}</Badge>
                      <span className="font-semibold">{entry.title}</span>
                    </div>
                    <span className="line-clamp-1 text-xs text-muted-foreground">
                      {entry.description}
                    </span>
                  </Link>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Others">
            <CommandItem
              className="flex-col cursor-pointer"
              asChild
              onSelect={() => {
                push("/beeps");
                setOpen(false);
              }}
            >
              <Link href="/beeps">
                <div className="flex gap-2 items-center self-start">
                  <MessageCircle />
                  <span className="font-semibold">Beeps</span>
                </div>
              </Link>
            </CommandItem>
            <CommandItem
              className="flex-col cursor-pointer"
              asChild
              onSelect={() => {
                push("/stats");
                setOpen(false);
              }}
            >
              <Link href="/stats">
                <div className="flex gap-2 items-center self-start">
                  <ChartColumn />
                  <span className="font-semibold">Stats</span>
                </div>
              </Link>
            </CommandItem>
            <CommandItem
              className="flex-col cursor-pointer"
              asChild
              onSelect={() => {
                push("/who-am-i");
                setOpen(false);
              }}
            >
              <Link href="/who-am-i">
                <div className="flex gap-2 items-center self-start">
                  <UserRound />
                  <span className="font-semibold">Who am I</span>
                </div>
              </Link>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
