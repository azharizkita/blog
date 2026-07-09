import * as React from "react";
import Link from "next/link";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";

import { getGistList, type GistList } from "@/repositories/gist";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

// Article types, in the order they appear in the nav. Matches the /[type]/[slug]
// route segment (lowercased) and the types getGistList("articles") returns.
const TYPE_ORDER = ["Blog", "Poem", "Sharing", "Literature"] as const;

export async function NavigationBar() {
  const articles = await getGistList("articles");

  // Group entries by their type so each becomes a nav dropdown.
  const byType = new Map<string, GistList>();
  for (const gist of articles) {
    const list = byType.get(gist.entry.type) ?? [];
    list.push(gist);
    byType.set(gist.entry.type, list);
  }

  return (
    <div className="w-full pl-2 flex-none overflow-x-auto">
      <NavigationMenu>
        <NavigationMenuPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 md:hidden" />
        <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            render={<Link href="/">Home</Link>}
          />
        </NavigationMenuItem>

        {TYPE_ORDER.map((type) => {
          const entries = byType.get(type);
          if (!entries || entries.length === 0) return null;

          const segment = type.toLowerCase();

          return (
            <NavigationMenuItem key={type}>
              <NavigationMenuTrigger>{type}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid max-h-96 w-[min(25rem,calc(100vw-2rem))] gap-2 overflow-y-auto md:w-125 md:grid-cols-2">
                  {entries.map((gist) => (
                    <ListItem
                      key={gist.id}
                      title={gist.entry.title}
                      href={`/${segment}/${gist.slug}`}
                    >
                      {gist.entry.description ?? ""}
                    </ListItem>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink
        render={
          <Link href={href}>
            <div className="flex flex-col gap-1 text-sm">
              <div className="leading-none font-medium">{title}</div>
              {children ? (
                <div className="line-clamp-2 text-muted-foreground">
                  {children}
                </div>
              ) : null}
            </div>
          </Link>
        }
      />
    </li>
  );
}
