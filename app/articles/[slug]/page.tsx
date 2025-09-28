import ArticleContent from "@/components/article-content";
import TimeAgo from "@/components/time-ago";
import { getGistDetails, getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";
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
    metadataBase: new URL(config.site.url),
    title: `${config.site.name} | ${title}`,
    description: description || undefined,
    alternates: {
      canonical: `${config.site.url}/articles/${slug}`,
    },
    openGraph: {
      url: `${config.site.url}/articles/${slug}`,
      siteName: `${config.site.name} | ${title}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(title)}` }],
    },
  };
}

export async function generateStaticParams() {
  const data = await getGistList("articles");
  if (!data.length) return [];

  return data.map(({ slug }) => ({
    slug,
  }));
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
    image: `${config.site.url}/api/og?title=${encodeURIComponent(title)}`,
    description: description || "",
    author: {
      "@type": "Person",
      name: config.author.name,
      email: config.author.email,
      url: config.author.url,
      sameAs: [
        config.author.url,
      ],
    },
    publisher: {
      "@type": "Person",
      name: config.author.name,
      url: config.author.url,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${config.site.url}/articles/${slug}`,
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
