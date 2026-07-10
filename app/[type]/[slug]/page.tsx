import ArticleContent from "@/components/article-content";
import TimeAgo from "@/components/time-ago";
import { getGistDetails, getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WithContext, Article as ArticleType } from "schema-dts";

// The article types getGistList("articles") can return, lowercased for the URL.
const SUPPORTED_TYPES = ["blog", "poem", "sharing", "literature"] as const;
type SupportedType = (typeof SUPPORTED_TYPES)[number];

function isSupportedType(value: string): value is SupportedType {
  return (SUPPORTED_TYPES as readonly string[]).includes(value);
}

type ArticleParams = { type: string; slug: string };

export async function generateStaticParams() {
  const data = await getGistList("articles");

  return data.map(({ entry, slug }) => ({
    type: entry.type.toLowerCase(),
    slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ArticleParams>;
}): Promise<Metadata> {
  const { type, slug } = await params;
  const repoData = await getGistDetails(slug);

  if (!repoData || repoData.entry.type.toLowerCase() !== type) notFound();

  const {
    entry: { title, description },
  } = repoData;

  const url = `/${type}/${slug}`;
  const image = `/api/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description: description || undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      siteName: config.site.name,
      title,
      description: description || undefined,
      url,
      locale: "en_US",
      publishedTime: repoData.created_at ?? undefined,
      modifiedTime: repoData.updated_at ?? undefined,
      authors: [config.author.url],
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || undefined,
      images: [image],
    },
  };
}

export default async function Article({
  params,
}: {
  params: Promise<ArticleParams>;
}) {
  const { type, slug } = await params;

  if (!isSupportedType(type)) notFound();

  const repoData = await getGistDetails(slug);

  if (!repoData) notFound();

  const content = repoData.files?.["index.md"]?.content;
  const {
    entry: { type: entryType, title, description },
  } = repoData;

  // The URL type must match the gist's actual type (no /blog/<a-poem-slug>).
  if (!content || entryType === "Beep" || entryType.toLowerCase() !== type) {
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
      sameAs: [config.author.url],
    },
    publisher: {
      "@type": "Person",
      name: config.author.name,
      url: config.author.url,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${config.site.url}/${type}/${slug}`,
    },
    datePublished: repoData.created_at,
    dateModified: repoData.updated_at,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape "<" so a "</script>" in any field can't break out of the tag.
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ArticleContent content={content} withBackNavigation />
      {repoData.created_at && (
        <TimeAgo time={repoData.created_at} updatedAt={repoData.updated_at} />
      )}
    </>
  );
}
