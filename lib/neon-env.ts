import { parseEnv } from "@neon/env";
import config from "../neon";

/**
 * Typed, validated access to the Neon env for this branch (pulled into
 * .env.local by `neon link` / `neon checkout` / `neon env pull`).
 *
 * Import this ONLY from code that actually talks to a Neon service:
 * `parseEnv` validates at import time, so importing it from an
 * always-loaded module would make the whole app require Neon vars
 * (including on deploys that don't define them yet).
 *
 *   const { postgres } = neonEnv();          // postgres.databaseUrl
 *   const { auth } = neonEnv();              // auth.baseUrl, auth.jwksUrl
 */
export function neonEnv() {
  return parseEnv(config);
}
