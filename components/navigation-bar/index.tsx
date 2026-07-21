import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";

import { getGistList, type GistList } from "@/repositories/gist";
import { CONTENT_TOPICS } from "@/lib/content-types";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export async function NavigationBar() {
  // The nav lives in the root layout, so a throw here would escape the page
  // error boundary. Degrade to the shell (just Home) if the API is unavailable.
  let articles: GistList = [];
  try {
    articles = await getGistList("articles");
  } catch {
    articles = [];
  }

  // Group entries by their type so each becomes a nav dropdown.
  const byType = new Map<string, GistList>();
  for (const gist of articles) {
    const list = byType.get(gist.entry.type) ?? [];
    list.push(gist);
    byType.set(gist.entry.type, list);
  }

  return (
    // px-1.5 + the trigger's own px-2.5 lines the nav text up with the
    // main column's px-4 left edge.
    <div className="no-scrollbar w-full px-1.5 flex-none overflow-x-auto">
      {/* w-max + justify-start: the shadcn defaults (max-w-max justify-center)
          center the list, so on narrow screens the overflow spills past the
          scroll container's LEFT edge where it can't be scrolled to (Home gets
          clipped). Sizing the nav to its content keeps all overflow on the
          reachable right side. */}
      <NavigationMenu className="w-max max-w-none justify-start">
        <NavigationMenuPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 md:hidden" />
        <NavigationMenuList className="justify-start">
        <NavigationMenuItem>
          <NavigationMenuLink
            className={navigationMenuTriggerStyle()}
            render={<Link href="/">Home</Link>}
          />
        </NavigationMenuItem>

        {CONTENT_TOPICS.map((type) => {
          const entries = byType.get(type);
          if (!entries || entries.length === 0) return null;

          const segment = type.toLowerCase();

          return (
            <NavigationMenuItem key={type}>
              <NavigationMenuTrigger>{type}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[min(20rem,calc(100vw-2rem))]">
                  <ul className="grid gap-2">
                    {entries.slice(0, 2).map((gist) => (
                      <ListItem
                        key={gist.id}
                        title={gist.entry.title}
                        href={`/${segment}/${gist.slug}`}
                      >
                        {gist.entry.description ?? ""}
                      </ListItem>
                    ))}
                  </ul>

                  <div className="mt-1.5 border-t pt-1.5">
                    <NavigationMenuLink
                      className="justify-between text-muted-foreground"
                      render={
                        <Link href={`/${segment}`}>
                          View all
                          <ArrowRightIcon className="size-4" />
                        </Link>
                      }
                    />
                  </div>
                </div>
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
