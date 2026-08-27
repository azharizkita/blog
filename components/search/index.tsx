"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface SearchItem {
  title: string;
  description: string | null;
  type: string;
  slug: string;
}

interface SiteSearchProps {
  items: SearchItem[];
}

/**
 * Nav-embedded ⌘K search: a trigger icon button plus a self-contained command
 * palette dialog. Items are grouped by their content type; selecting one
 * navigates to `/${type.toLowerCase()}/${slug}` and closes the dialog.
 */
export function SiteSearch({ items }: SiteSearchProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const groups = new Map<string, SearchItem[]>();
  for (const item of items) {
    const list = groups.get(item.type) ?? [];
    list.push(item);
    groups.set(item.type, list);
  }

  const handleSelect = (item: SearchItem) => {
    setOpen(false);
    router.push(`/${item.type.toLowerCase()}/${item.slug}`);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search articles…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {Array.from(groups.entries()).map(([type, entries]) => (
              <CommandGroup key={type} heading={type}>
                {entries.map((item) => (
                  <CommandItem
                    key={`${item.type}-${item.slug}`}
                    value={`${item.type} ${item.title} ${item.description ?? ""} ${item.type} ${item.slug}`}
                    onSelect={() => handleSelect(item)}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">{item.title}</span>
                      {item.description && (
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
