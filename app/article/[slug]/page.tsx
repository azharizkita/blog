import ArticleContent from "@/components/ArticleContent";
import ScrollToHash from "@/components/ScrollToHash";
import { getGistDetails } from "@/repositories/gist";
import { parseEntry } from "@/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;
  const { data: repoData } = await getGistDetails(slug);

  const { title, description } = parseEntry(repoData.description ?? "");

  return {
    title: `Silenced | ${title}`,
    description: description,
  };
}

export default async function Blog({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { data: repoData } = await getGistDetails(slug);

  const content = repoData.files?.["index.md"]?.content;

  if (!content) {
    notFound();
  }

  const { type } = parseEntry(repoData.description ?? "");

  const createdAt = repoData?.created_at
    ? Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
      }).format(new Date(repoData?.created_at))
    : "";

  const isPoetry = type === "Poetry";

  return (
    <>
      <ScrollToHash />
      <ArticleContent content={content} isPoetry={isPoetry} />
      <p
        style={{
          paddingLeft: isPoetry ? "unset" : "2em",
          color: "var(--paragraph-color)",
          textAlign: isPoetry ? "center" : "unset",
        }}
      >
        {createdAt}
      </p>
    </>
  );
}
