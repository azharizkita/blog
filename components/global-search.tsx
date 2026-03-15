"use client";

import * as React from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shadcn/components/ui/button";
import { Badge } from "@/shadcn/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shadcn/components/ui/command";

interface SearchItem {
  label: string;
  href: string;
  value?: string;
  badge?: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SearchGroup {
  heading: string;
  items: SearchItem[];
}

interface GlobalSearchProps {
  groups: SearchGroup[];
  placeholder?: string;
}

export default function GlobalSearch({
  groups,
  placeholder = "Type to search...",
}: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false);

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
        className="size-10.5"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {groups.map((group, groupIndex) => (
              <React.Fragment key={group.heading}>
                {groupIndex > 0 && <CommandSeparator />}
                <CommandGroup heading={group.heading}>
                  {group.items.map((item) => {
                    const content = (
                      <>
                        {item.icon}
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex gap-2 items-center">
                            {item.badge && (
                              <Badge variant="secondary">{item.badge}</Badge>
                            )}
                            <span className="font-semibold line-clamp-1">
                              {item.label}
                            </span>
                          </div>
                          {item.description && (
                            <span className="line-clamp-1 text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </>
                    );

                    return (
                      <CommandItem
                        key={item.value ?? item.href}
                        className="cursor-pointer"
                        value={item.value ?? item.label}
                        onSelect={() => setOpen(false)}
                      >
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="flex gap-2 items-center w-full"
                            tabIndex={-1}
                            onClick={() => setOpen(false)}
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
