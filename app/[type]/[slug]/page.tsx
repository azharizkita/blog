import ArticleContent from "@/components/article-content";
import TimeAgo from "@/components/time-ago";
import { FeedRow } from "@/components/feed";
import { ShareButton } from "@/components/share-button";
import { buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import extractCoverImage from "@/lib/extract-cover-image";
import { getGistDetails, getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";
import { formatDate } from "@/lib/format-date";
import readingTime from "@/lib/reading-time";
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
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  // The article's annotated cover image (editor "Set as cover" marker)
  // beats the generated OG card for link previews and rich results.
  const cover = extractCoverImage(repoData.files?.["index.md"]?.content ?? "");
  const image = cover?.src ?? `/api/og?title=${encodeURIComponent(title)}`;

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
      images: [
        {
          url: image,
          width: cover?.width ?? 1200,
          height: cover?.height ?? 630,
          alt: cover?.alt || title,
        },
      ],
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
    { name: config.site.name, href: "/" },
    { name: entryType, href: `/${type}` },
    { name: title, href: `/${type}/${slug}` },
  ];

  const blogPosting: BlogPosting = {
    "@type": "BlogPosting",
    headline: title,
    url,
    image:
      extractCoverImage(content)?.src ??
      `${config.site.url}/api/og?title=${encodeURIComponent(title)}`,
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

  const minutes = readingTime(content);

  // Full same-type chronological list (newest first), self included — used
  // to locate this entry's position so we can derive its older/newer
  // neighbors for the prev/next footer links.
  const sameType = (
    await getGistList("articles", {
      topic: entryType as ContentTopic,
    })
  ).sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );

  const selfIndex = sameType.findIndex((gist) => gist.slug === slug);
  // Sorted newest-first: the next index down is older, the previous index is newer.
  const prevPost = selfIndex >= 0 ? sameType[selfIndex + 1] : undefined;
  const nextPost = selfIndex > 0 ? sameType[selfIndex - 1] : undefined;

  // Other entries of the same type, for internal linking (no dead-ends).
  const siblingsSorted = sameType.filter((gist) => gist.slug !== slug);
  const related = siblingsSorted.slice(0, 5);

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

      <header className="mx-auto max-w-2xl space-y-4 pt-8 text-center">
        <div className="prose-muted flex justify-center gap-3 text-xs tracking-wide uppercase">
          {repoData.created_at && (
            <>
              <time dateTime={repoData.created_at}>
                {formatDate(repoData.created_at)}
              </time>
              <span aria-hidden>&middot;</span>
            </>
          )}
          <span>{minutes} min read</span>
          <span aria-hidden>&middot;</span>
          <Link href={`/${type}`}>{entryType}</Link>
        </div>
        {description ? <p className="prose-lead text-center">{description}</p> : null}
        <div className="flex justify-center">
          <ShareButton title={title} url={url} />
        </div>
      </header>

      <ArticleContent content={content} withBackNavigation />
      {repoData.created_at && (
        <TimeAgo time={repoData.created_at} updatedAt={repoData.updated_at} />
      )}

      <div className="flex items-center justify-between border-t pt-8">
        {prevPost ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/${type}/${prevPost.slug}`}
                  aria-label={prevPost.entry.title}
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <ArrowLeft />
                </Link>
              }
            />
            <TooltipContent>{prevPost.entry.title}</TooltipContent>
          </Tooltip>
        ) : (
          <span />
        )}
        <p className="prose-muted text-xs">Published in {entryType}</p>
        {nextPost ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/${type}/${nextPost.slug}`}
                  aria-label={nextPost.entry.title}
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <ArrowRight />
                </Link>
              }
            />
            <TooltipContent>{nextPost.entry.title}</TooltipContent>
          </Tooltip>
        ) : (
          <span />
        )}
      </div>

      {related.length > 0 ? (
        <section className="space-y-4">
          <h2 className="prose-h3">Related</h2>
          <div className="divide-y">
            {related.map((sibling) => (
              <FeedRow key={sibling.id} gist={sibling} />
            ))}
          </div>
        </section>
      ) : null}

      <Breadcrumbs items={crumbs} />
    </>
  );
}
