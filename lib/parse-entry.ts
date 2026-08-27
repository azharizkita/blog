type EntryType = "Blog" | "Poem" | "Sharing" | "Beep" | "Literature";

interface BlogEntry {
  type: "Blog";
  featured: boolean;
  title: string;
  description: string;
}

interface BeepEntry {
  type: "Beep";
  featured: boolean;
  title: string;
  description: string;
}

interface PoetEntry {
  type: "Poem";
  featured: boolean;
  title: string;
  description: string | null;
}

interface SharingEntry {
  type: "Sharing";
  featured: boolean;
  languageTag: string;
  title: string;
  description: string;
}

interface LiteratureEntry {
  type: "Literature";
  featured: boolean;
  title: string;
  description: string;
}

type Entry = BlogEntry | PoetEntry | SharingEntry | BeepEntry | LiteratureEntry;

export default function parseEntry(entry: string): Entry {
  const parts = entry.split(" - ");
  const rawType = parts[0]?.trim() ?? "";
  // A trailing "!" on the type segment marks the entry as featured
  // (e.g. "Blog! - Title - Description"). Absent = not featured, so every
  // existing gist description keeps parsing unchanged.
  const featured = rawType.endsWith("!");
  const type = (featured ? rawType.slice(0, -1) : rawType) as EntryType;

  // Missing trailing segments (e.g. a Sharing gist with no description) must
  // degrade to "" instead of throwing and taking down the whole gist list.
  const part = (index: number) => parts[index]?.trim() ?? "";

  switch (type) {
    case "Blog":
      return {
        type: "Blog",
        featured,
        title: part(1),
        description: part(2),
      };
    case "Beep":
      return {
        type: "Beep",
        featured,
        title: part(1),
        description: part(2),
      };
    case "Poem":
      return {
        type: "Poem",
        featured,
        title: part(1),
        description: parts[2]?.trim() ?? null,
      };
    case "Sharing":
      return {
        type: "Sharing",
        featured,
        languageTag: part(1),
        title: part(2),
        description: part(3),
      };
    case "Literature":
      return {
        type: "Literature",
        featured,
        title: part(1),
        description: part(2),
      };
    default:
      throw new Error(`Post type haven't handled: ${type}`);
  }
}
