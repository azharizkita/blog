import PostEntry from "@/components/PostEntry";
import { getGistList } from "@/repositories/gist";

export default async function Home() {
  const list = await getGistList();

  return (
    <>
      {list.map(({ description, slug, created_at, entry }, i) => {
        if (!description) return null;

        return (
          <PostEntry
            key={i}
            entry={entry}
            description={description}
            createdAt={created_at}
            slug={slug}
          />
        );
      })}
    </>
  );
}
