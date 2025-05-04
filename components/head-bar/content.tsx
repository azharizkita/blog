import {
  ChartColumn,
  ChevronsUpDown,
  Link2,
  MessageCircle,
  Newspaper,
  UserRound,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import Link from "next/link";
import { getGistList } from "@/repositories/gist";

export default async function Content() {
  const beeps = await getGistList("beeps");
  const articles = await getGistList("articles");

  return (
    <nav className="flex flex-col overflow-y-auto">
      <Collapsible>
        <CollapsibleTrigger
          asChild
          className="w-full flex justify-start"
        >
          <Button
            variant="link"
            size="sm"
            className="!p-0 font-bold cursor-pointer text-foreground"
          >
            <Newspaper />
            <Link href="/articles">Articles ({articles.length})</Link>
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-1 ml-3 flex flex-col">
          {articles.map(({ entry, slug }) => (
            <Button
              variant="link"
              className="w-fit !p-0 text-foreground cursor-pointer"
              key={slug}
            >
              <Link2 />
              <Link href={`/articles/${slug}`}>{entry.title}</Link>
            </Button>
          ))}
        </CollapsibleContent>
      </Collapsible>
      <Button
        variant="link"
        className="w-fit !p-0 cursor-pointer text-foreground font-bold"
      >
        <MessageCircle />
        <Link href="/beeps">Beeps ({beeps.length})</Link>
      </Button>
      <Button
        variant="link"
        className="w-fit !p-0 cursor-pointer text-foreground font-bold"
      >
        <ChartColumn />
        <Link href="/stats">Stats</Link>
      </Button>
      <Button
        variant="link"
        className="w-fit !p-0 cursor-pointer text-foreground font-bold"
      >
        <UserRound />
        <Link href="/who-am-i">Me</Link>
      </Button>
    </nav>
  );
}
