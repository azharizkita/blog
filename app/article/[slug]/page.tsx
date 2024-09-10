import { getGistContent, getGistDetails } from "@/repositories/gist";
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

  const { data } = await getGistContent(content);

  const createdAt = repoData?.created_at
    ? Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
      }).format(new Date(repoData?.created_at))
    : "";

  return (
    <>
      <article
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: data }}
      />
      <p style={{ paddingLeft: "2em", color: "GrayText" }}>{createdAt}</p>
    </>
  );
}
