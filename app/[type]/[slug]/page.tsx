import ArticleContent from "@/components/article-content";
import TimeAgo from "@/components/time-ago";
import { getGistDetails, getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";
import { formatDate } from "@/lib/format-date";
import { JsonLd } from "@/components/json-ld";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  BLOG_ID,
  PERSON_ID,
  breadcrumbNode,
  graph,
} from "@/lib/structured-data";
import { rssAlternate } from "@/lib/metadata";
import { isContentSegment, type ContentTopic } from "@/lib/content-types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BlogPosting } from "schema-dts";

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
      types: rssAlternate,
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

  if (!isContentSegment(type)) notFound();

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

  const url = `${config.site.url}/${type}/${slug}`;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const crumbs = [
    { name: "Home", href: "/" },
    { name: entryType, href: `/${type}` },
    { name: title, href: `/${type}/${slug}` },
  ];

  const blogPosting: BlogPosting = {
    "@type": "BlogPosting",
    headline: title,
    url,
    image: `${config.site.url}/api/og?title=${encodeURIComponent(title)}`,
    description: description || "",
    inLanguage: "en",
    articleSection: entryType,
    wordCount,
    isPartOf: { "@id": BLOG_ID },
    author: {
      "@type": "Person",
      "@id": PERSON_ID,
      name: config.author.name,
      url: config.author.url,
      sameAs: [config.author.url],
    },
    publisher: { "@id": PERSON_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: repoData.created_at,
    dateModified: repoData.updated_at,
  };

  // Other entries of the same type, for internal linking (no dead-ends).
  const siblings = (
    await getGistList("articles", {
      topic: entryType as ContentTopic,
    })
  )
    .filter((gist) => gist.slug !== slug)
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )
    .slice(0, 4);

  return (
    <>
      <JsonLd
        data={graph(
          blogPosting,
          breadcrumbNode(
            crumbs.map((c) => ({
              name: c.name,
              url: `${config.site.url}${c.href}`,
            })),
          ),
        )}
      />

      <ArticleContent content={content} withBackNavigation />
      {repoData.created_at && (
        <TimeAgo time={repoData.created_at} updatedAt={repoData.updated_at} />
      )}

      {siblings.length > 0 ? (
        <section className="space-y-4 border-t pt-8">
          <h2 className="prose-h3">More in {entryType}</h2>
          <ul className="space-y-4">
            {siblings.map((sibling) => (
              <li key={sibling.id}>
                <Link
                  href={`/${type}/${sibling.slug}`}
                  className="group block space-y-1"
                >
                  <p className="prose-muted text-xs uppercase tracking-wide">
                    {formatDate(sibling.created_at)}
                  </p>
                  <h3 className="prose-small font-medium transition-colors group-hover:text-muted-foreground">
                    {sibling.entry.title}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Breadcrumbs items={crumbs} />
    </>
  );
}
