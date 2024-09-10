import PostEntry from "@/components/PostEntry";
import { getGistList } from "@/repositories/gist";

export default async function Home() {
  const list = await getGistList();

  return (
    <>
      {list.data.map(({ description, id, created_at }, i) => {
        if (!description) return null;

        return <PostEntry key={i} description={description} id={id} createdAt={created_at} />;
      })}
    </>
  );
}
