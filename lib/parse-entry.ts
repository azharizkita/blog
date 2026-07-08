type EntryType = "Blog" | "Poem" | "Sharing" | "Beep" | "Literature";

interface BlogEntry {
  type: "Blog";
  title: string;
  description: string;
}

interface BeepEntry {
  type: "Beep";
  title: string;
  description: string;
}

interface PoetEntry {
  type: "Poem";
  title: string;
  description: string | null;
}

interface SharingEntry {
  type: "Sharing";
  languageTag: string;
  title: string;
  description: string;
}

interface LiteratureEntry {
  type: "Literature";
  title: string;
  description: string;
}

type Entry = BlogEntry | PoetEntry | SharingEntry | BeepEntry | LiteratureEntry;

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
    case "Beep":
      return {
        type: "Beep",
        title: parts[1].trim(),
        description: parts[2].trim(),
      };
    case "Poem":
      return {
        type: "Poem",
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
    case "Literature":
      return {
        type: "Literature",
        title: parts[1].trim(),
        description: parts[2].trim(),
      };
    default:
      throw new Error(`Post type haven't handled: ${type}`);
  }
}
