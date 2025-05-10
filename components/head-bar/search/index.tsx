import { getGistList } from "@/repositories/gist";
import SearchContent from "./search-content";

export default async function Search() {
  const articles = await getGistList('articles');

  return <SearchContent articles={articles} />;
}
