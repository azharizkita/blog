/**
 * The article types the site publishes. Single source of truth for the nav,
 * the /[type] and /[type]/[slug] routes, the sitemap, and the gist
 * repository filters — add a new type here and every surface picks it up.
 */
export const CONTENT_TOPICS = ["Blog", "Poem", "Sharing", "Literature"] as const;

export type ContentTopic = (typeof CONTENT_TOPICS)[number];

/** Lowercase URL segment for a topic, e.g. "blog" in /blog/[slug]. */
export type ContentSegment = Lowercase<ContentTopic>;

export const CONTENT_SEGMENTS = CONTENT_TOPICS.map(
  (topic) => topic.toLowerCase() as ContentSegment,
);

export function isContentSegment(value: string): value is ContentSegment {
  return (CONTENT_SEGMENTS as string[]).includes(value);
}

export function topicFromSegment(segment: ContentSegment): ContentTopic {
  return CONTENT_TOPICS[CONTENT_SEGMENTS.indexOf(segment)];
}
