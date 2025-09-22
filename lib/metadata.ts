import type { Metadata } from "next";
import { config } from "@/lib/config";

interface PageMetadataOptions {
  title: string;
  description: string;
  path?: string;
}

export function createPageMetadata({
  title,
  description,
  path
}: PageMetadataOptions): Metadata {
  const url = path ? `${config.site.url}${path}` : config.site.url;

  return {
    metadataBase: new URL(config.site.url),
    title: `${config.site.name} | ${title}`,
    description,
    openGraph: {
      url,
      siteName: `${config.site.name} | ${title}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(title)}` }],
    },
  };
}

export const defaultMetadata = createPageMetadata({
  title: "Welcome",
  description: `Personal dumps by ${process.env.GITHUB_USERNAME}`,
});