export const ENTRY_TYPES = [
  "Blog",
  "Poem",
  "Sharing",
  "Beep",
  "Literature",
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export interface EntryInput {
  type: EntryType;
  title: string;
  description: string;
  /** Required for Sharing entries, unused otherwise. */
  languageTag?: string;
}

export const ENTRY_DELIMITER = " - ";

/**
 * Inverse of lib/parse-entry.ts: builds the ` - `-delimited gist description.
 * Throws with a user-facing message when the metadata can't round-trip.
 */
export default function composeEntry(entry: EntryInput): string {
  const { type, title, description, languageTag } = entry;

  if (!title.trim()) {
    throw new Error("Title is required.");
  }

  const fields: Array<[string, string]> = [
    ["Title", title],
    ["Description", description],
    ["Language tag", languageTag ?? ""],
  ];
  for (const [label, value] of fields) {
    if (value.includes(ENTRY_DELIMITER)) {
      throw new Error(
        `${label} can't contain "${ENTRY_DELIMITER}" — it's the metadata delimiter.`,
      );
    }
  }

  const parts: string[] = [type];

  if (type === "Sharing") {
    if (!languageTag?.trim()) {
      throw new Error("Sharing entries need a language tag.");
    }
    parts.push(languageTag.trim());
  }

  parts.push(title.trim());

  const trimmedDescription = description.trim();
  // Poem descriptions are optional (parse-entry yields null); omit the
  // trailing segment instead of writing "Poem - Title - ".
  if (trimmedDescription || type !== "Poem") {
    parts.push(trimmedDescription);
  }

  return parts.join(ENTRY_DELIMITER);
}
