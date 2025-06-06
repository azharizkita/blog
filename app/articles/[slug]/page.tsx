import ArticleContent from "@/components/article-content";
import TimeAgo from "@/components/time-ago";
import { getGistDetails, getGistList } from "@/repositories/gist";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { WithContext, Article as ArticleType } from "schema-dts";

export const dynamic = "force-static";

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
      url: `https://silenced.life/articles/${slug}`,
      siteName: `Silenced | ${title}`,
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

export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const repoData = await getGistDetails(slug);

  if (!repoData) notFound();

  const content = repoData.files?.["index.md"]?.content;
  const {
    entry: { type, title, description },
  } = repoData;

  if (!content || type === "Beep") {
    notFound();
  }

  const jsonLd: WithContext<ArticleType> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    image: `https://silenced.life/api/og?title=${title}`,
    description: description ?? "",
    author: {
      "@type": "Person",
      name: process.env.GITHUB_USERNAME,
      url: `https://github.com/${process.env.GITHUB_USERNAME}`,
    },
    datePublished: repoData.created_at,
    dateModified: repoData.updated_at,
  };

  return (
    <>
      <Script type="application/ld+json" id="schema">
        {JSON.stringify(jsonLd)}
      </Script>
      {repoData?.created_at && (
        <TimeAgo
          time={repoData.created_at}
          updatedAt={repoData.updated_at}
          className="flex flex-col"
        />
      )}
      <ArticleContent content={content} withBackNavigation />
    </>
  );
}
