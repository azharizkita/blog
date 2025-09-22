import ContentItem from "@/components/content-item";
import { getGistList } from "@/repositories/gist";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-static";

export const metadata = createPageMetadata({
  title: "Beeps",
  description: "Beeps is a space to express fleeting thoughts—when there's no one to talk to, when the mind feels heavy, or just to let things out. A personal stream of consciousness, without filters.",
  path: "/beeps"
});

export default async function Beeps() {
  const list = await getGistList("beeps");

  return (
    <div className="grid auto-rows-min gap-4">
      {list.reverse().map((item) => (
        <ContentItem
          key={item.id}
          content={item}
          variant="beep"
        />
      ))}
    </div>
  );
}
