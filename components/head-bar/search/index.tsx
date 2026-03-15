import { getGistList } from "@/repositories/gist";
import GlobalSearch from "@/components/global-search";
import {
  ChartColumn,
  MessageCircle,
  UserRound,
} from "lucide-react";

export default async function Search() {
  const articles = await getGistList("articles");

  return (
    <GlobalSearch
      groups={[
        {
          heading: "Articles",
          items: articles.map(({ slug, entry }) => ({
            label: entry.title,
            href: `/articles/${slug}`,
            value: slug,
            badge: entry.type,
            description: entry.description ?? undefined,
          })),
        },
        {
          heading: "Others",
          items: [
            {
              label: "Beeps",
              href: "/beeps",
              icon: <MessageCircle />,
            },
            {
              label: "Stats",
              href: "/stats",
              icon: <ChartColumn />,
            },
            {
              label: "Who am I",
              href: "/who-am-i",
              icon: <UserRound />,
            },
          ],
        },
      ]}
    />
  );
}
