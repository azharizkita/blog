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
  const type = parts[0]?.trim() as EntryType;

  // Missing trailing segments (e.g. a Sharing gist with no description) must
  // degrade to "" instead of throwing and taking down the whole gist list.
  const part = (index: number) => parts[index]?.trim() ?? "";

  switch (type) {
    case "Blog":
      return {
        type: "Blog",
        title: part(1),
        description: part(2),
      };
    case "Beep":
      return {
        type: "Beep",
        title: part(1),
        description: part(2),
      };
    case "Poem":
      return {
        type: "Poem",
        title: part(1),
        description: parts[2]?.trim() ?? null,
      };
    case "Sharing":
      return {
        type: "Sharing",
        languageTag: part(1),
        title: part(2),
        description: part(3),
      };
    case "Literature":
      return {
        type: "Literature",
        title: part(1),
        description: part(2),
      };
    default:
      throw new Error(`Post type haven't handled: ${type}`);
  }
}
