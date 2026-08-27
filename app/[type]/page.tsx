import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";
import { JsonLd } from "@/components/json-ld";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Feed } from "@/components/feed";
import { breadcrumbNode, collectionPageNode, graph } from "@/lib/structured-data";
import { rssAlternate } from "@/lib/metadata";
import {
  CONTENT_SEGMENTS,
  isContentSegment,
  topicFromSegment,
  type ContentSegment,
} from "@/lib/content-types";

// Lead blurb shown under each type heading (and reused as the meta
// description). Draft copy — tweak the wording to taste.
const TYPE_LEADS: Record<ContentSegment, string> = {
  blog: "Long-form dumps from my head—work, tech, life, and the odd late-night rant. Read at your own risk.",
  poem: "The things I couldn't say out loud, so I broke them into lines instead.",
  sharing: "Stuff I found too good to keep to myself—snippets, tricks, and ideas worth passing on.",
  literature: "Slower pieces. Stories and reflections I sat with long enough to actually write down.",
};

type TypeParams = { type: string };

export async function generateStaticParams() {
  return CONTENT_SEGMENTS.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<TypeParams>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!isContentSegment(type)) notFound();

  const topic = topicFromSegment(type);
  const url = `/${type}`;
  const description = TYPE_LEADS[type];
  const image = `/api/og?title=${encodeURIComponent(topic)}`;

  return {
    title: topic,
    description,
    alternates: { canonical: url, types: rssAlternate },
    openGraph: {
      type: "website",
      siteName: config.site.name,
      title: `${topic} | ${config.site.name}`,
      description,
      url,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: topic }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${topic} | ${config.site.name}`,
      description,
      images: [image],
    },
  };
}

export default async function TypeListing({
  params,
}: {
  params: Promise<TypeParams>;
}) {
  const { type } = await params;
  if (!isContentSegment(type)) notFound();

  const topic = topicFromSegment(type);
  const entries = await getGistList("articles", { topic });

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );

  const crumbs = [
    { name: "Home", href: "/" },
    { name: topic, href: `/${type}` },
  ];

  return (
    <>
      <JsonLd
        data={graph(
          collectionPageNode({
            name: topic,
            description: TYPE_LEADS[type],
            url: `${config.site.url}/${type}`,
          }),
          breadcrumbNode(
            crumbs.map((c) => ({
              name: c.name,
              url: `${config.site.url}${c.href}`,
            })),
          ),
        )}
      />

      <section className="space-y-2">
        <h1 className="prose-h1">
          <span className="text-primary">#</span>
          {topic.toLowerCase()}
        </h1>
        <p className="prose-lead">{TYPE_LEADS[type]}</p>
        <p className="prose-muted text-xs">
          {sorted.length} {sorted.length === 1 ? "entry" : "entries"}
        </p>
      </section>
      <section className="space-y-6">
        <Feed gists={sorted} />
      </section>

      <Breadcrumbs items={crumbs} />
    </>
  );
}
