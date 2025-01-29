export default function getSlug(value: string) {
  try {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  } catch {
    return value;
  }
}
