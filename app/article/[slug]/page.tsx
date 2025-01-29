import ArticleContent from "@/components/article-content";
import ScrollToHash from "@/components/scroll-to-hash";
import TimeAgo from "@/components/time-ago";
import { getGistDetails, getGistList } from "@/repositories/gist";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { WithContext, BlogPosting } from "schema-dts";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const repoData = await getGistDetails(slug);

  if (!repoData) notFound();

  const {
    entry: { title, description },
  } = repoData;

  return {
    title: `Silenced | ${title}`,
    description: description,
    openGraph: {
      images: [{ url: `/api/og?title=${title}` }],
    },
  };
}

export async function generateStaticParams() {
  const data = await getGistList();
  if (!data) return [];

  return data.map(({ slug }) => {
    return {
      slug,
    };
  });
}

export default async function Blog({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const repoData = await getGistDetails(slug);

  if (!repoData) notFound();

  const content = repoData.files?.["index.md"]?.content;

  if (!content) {
    notFound();
  }

  const {
    entry: { type, title, description },
  } = repoData;

  const isPoetry = type === "Poetry";

  const jsonLd: WithContext<BlogPosting> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    name: `Silenced | ${title}`,
    image: `https://silenced.life/api/og?title=${title}`,
    description: description ?? "",
  };

  return (
    <>
      <Script type="application/ld+json" id="schema">
        {JSON.stringify(jsonLd)}
      </Script>
      <ScrollToHash />
      {repoData?.created_at && (
        <TimeAgo
          time={repoData.created_at}
          updatedAt={!isPoetry ? repoData.updated_at : ""}
          className="flex flex-col"
        />
      )}
      <ArticleContent content={content} isPoetry={isPoetry} />
    </>
  );
}
