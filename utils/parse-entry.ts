type EntryType = "Blog" | "Poetry" | "Sharing";

interface BlogEntry {
  type: "Blog";
  title: string;
  description: string;
}

interface PoetEntry {
  type: "Poetry";
  title: string;
  description: string | null;
}

interface SharingEntry {
  type: "Sharing";
  languageTag: string;
  title: string;
  description: string;
}

type Entry = BlogEntry | PoetEntry | SharingEntry;

export default function parseEntry(entry: string): Entry {
  const parts = entry.split(" - ");
  const type = parts[0].trim() as EntryType;

  switch (type) {
    case "Blog":
      return {
        type: "Blog",
        title: parts[1].trim(),
        description: parts[2].trim(),
      };
    case "Poetry":
      return {
        type: "Poetry",
        title: parts[1].trim(),
        description: parts[2]?.trim() ?? null,
      };
    case "Sharing":
      return {
        type: "Sharing",
        languageTag: parts[1].trim(),
        title: parts[2].trim(),
        description: parts[3].trim(),
      };
    default:
      throw new Error(`Post type haven't handled: ${type}`);
  }
}
