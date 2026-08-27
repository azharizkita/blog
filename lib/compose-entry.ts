import parseEntry from "@/lib/parse-entry";

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
  /** Marks the entry as featured; composes to a trailing "!" on the type segment. */
  featured?: boolean;
}

export const ENTRY_DELIMITER = " - ";

/**
 * Inverse of lib/parse-entry.ts: builds the ` - `-delimited gist description.
 * Throws with a user-facing message when the metadata can't round-trip.
 */
export default function composeEntry(entry: EntryInput): string {
  const { type, title, description, languageTag, featured } = entry;

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

  const parts: string[] = [type + (featured ? "!" : "")];

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

  const composed = parts.join(ENTRY_DELIMITER);

  // Round-trip guard: a value ending/starting with a bare "-" can form a
  // new " - " delimiter at the join (e.g. title "Foo -" + description
  // "desc" composes to "Blog - Foo - - desc", which parses back with
  // title "Foo" and description "- desc"). Catch that silent corruption
  // here instead of letting it reach GitHub.
  const roundTripped = parseEntry(composed);
  const expectedDescription =
    type === "Poem" && !trimmedDescription ? null : trimmedDescription;
  const roundTripFailed =
    roundTripped.type !== type ||
    roundTripped.featured !== Boolean(featured) ||
    roundTripped.title !== title.trim() ||
    roundTripped.description !== expectedDescription ||
    (type === "Sharing" &&
      roundTripped.type === "Sharing" &&
      roundTripped.languageTag !== (languageTag ?? "").trim());
  if (roundTripFailed) {
    throw new Error(
      'Metadata doesn\'t survive the " - " encoding — remove stray "-" from the edges of your fields.',
    );
  }

  return composed;
}
