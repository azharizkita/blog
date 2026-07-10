import { getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";

// Shared IndexNow endpoint — fans out to all participating engines (Bing,
// Yandex, Seznam, Naver, ...). Google does not participate.
const ENDPOINT = "https://api.indexnow.org/indexnow";

export function keyLocation() {
  return `${config.site.url}/${config.indexNow.key}.txt`;
}

/** Every canonical URL on the site: home + type pages + articles. */
export async function getIndexNowUrls(): Promise<string[]> {
  const base = config.site.url;
  const urls = new Set<string>([base]);

  const articles = await getGistList("articles");
  for (const gist of articles) {
    const type = gist.entry.type.toLowerCase();
    urls.add(`${base}/${type}`);
    urls.add(`${base}/${type}/${gist.slug}`);
  }

  return [...urls];
}

/** Submit a batch of URLs to IndexNow. Up to 10,000 per call. */
export async function submitUrls(urls: string[]) {
  if (urls.length === 0) return { submitted: 0, status: 204 };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(config.site.url).host,
      key: config.indexNow.key,
      keyLocation: keyLocation(),
      urlList: urls.slice(0, 10000),
    }),
  });

  return { submitted: Math.min(urls.length, 10000), status: res.status };
}
