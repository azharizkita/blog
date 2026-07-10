/**
 * Renders a JSON-LD structured-data block into the server HTML. Uses a plain
 * <script> (not next/script) so it's present in the SSR output crawlers read,
 * and escapes "<" so a "</script>" in any field can't break out of the tag.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
