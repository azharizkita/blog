export { encodeAttribute } from "./legacy";

/** Inverse of `encodeAttribute`; `&amp;` is decoded last. */
export function decodeAttribute(value: string): string {
  return value
    .replaceAll("&#10;", "\n")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}
