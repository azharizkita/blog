import type {
  Blog,
  BreadcrumbList,
  CollectionPage,
  Person,
  Thing,
  WebSite,
} from "schema-dts";

import { config } from "@/lib/config";

// Stable @id anchors so entities can be cross-referenced across pages.
export const PERSON_ID = `${config.site.url}/#person`;
export const WEBSITE_ID = `${config.site.url}/#website`;
export const BLOG_ID = `${config.site.url}/#blog`;

/** Wrap one or more schema nodes in a @graph document. */
export function graph(...nodes: Thing[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

export function personNode(description?: string): Person {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: config.author.name,
    url: config.site.url,
    description: description ?? config.site.description,
    sameAs: [config.author.url],
  };
}

export function websiteNode(description?: string): WebSite {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: config.site.url,
    name: config.site.name,
    description: description ?? config.site.description,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

export function blogNode(description?: string): Blog {
  return {
    "@type": "Blog",
    "@id": BLOG_ID,
    url: config.site.url,
    name: config.site.name,
    description: description ?? config.site.description,
    inLanguage: "en",
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
  };
}

export function collectionPageNode(input: {
  name: string;
  description: string;
  url: string;
}): CollectionPage {
  return {
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    author: { "@id": PERSON_ID },
  };
}

export function breadcrumbNode(
  items: { name: string; url: string }[],
): BreadcrumbList {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
