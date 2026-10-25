// LEGACY SHIM — remove after production migration (spec §6)
// Import-free apart from legacy.ts on purpose: scripts/migrate-content-lib.ts
// shares LEGACY_POST_SLUGS by relative path.
import { convertLegacyMarkdown } from "./legacy.ts";

/** The only posts that still held MDX-era syntax (migration dry run). id -> slug. */
export const LEGACY_POST_IDS: Readonly<Record<string, string>> = {
  fe6fe05ced6e4add8a016b28fd48550d: "hiduplah-dengan-tenang",
  "5322083633be1d28f9a1fd89cdeae06b": "the-astral-omen",
  "75c9f5b6671099131da27459cc746583": "the-weight-of-silence",
  "713df2215b5a4f85611d28c210a021eb": "21-guns",
};

export const LEGACY_POST_SLUGS: readonly string[] = Object.values(LEGACY_POST_IDS).sort();

/** Converts MDX-era syntax for the four legacy posts; every other post is returned untouched. */
export function applyLegacyShim(id: string, content: string): string {
  return Object.hasOwn(LEGACY_POST_IDS, id) ? convertLegacyMarkdown(content).content : content;
}
