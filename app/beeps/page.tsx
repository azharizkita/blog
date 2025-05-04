import BeepItem from "@/components/beep-item";
import { getGistList } from "@/repositories/gist";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: new URL("https://silenced.life"),
  title: "Silenced | Beeps",
  description:
    "Beeps is a space to express fleeting thoughts—when there's no one to talk to, when the mind feels heavy, or just to let things out. A personal stream of consciousness, without filters.",
  openGraph: {
    url: "https://silenced.life/beeps",
    siteName: "Silenced | Beeps",
    images: [{ url: "/api/og?title=Beeps" }],
  },
};

export default async function Beeps() {
  const list = await getGistList("beeps");

  return (
    <div className="grid auto-rows-min gap-4">
      {list.reverse().map(({ description, slug, created_at, entry }, i) => {
        if (!description) return null;

        return (
          <BeepItem key={i} entry={entry} createdAt={created_at} slug={slug} />
        );
      })}
    </div>
  );
}
