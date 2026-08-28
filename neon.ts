import { defineConfig } from "@neon/config/v1";

/**
 * Neon branch config for project "blog" (quiet-fire-97183815, org Azhari).
 * Declares the services every branch should carry — Lakebase Postgres is
 * implicit; Neon Auth is provisioned on production. `neon env pull` pulls
 * exactly these services' variables and fails fast if a branch is missing
 * one (`neon deploy` provisions it).
 *
 * Note: this project lives in aws-ap-southeast-1, so the public-beta
 * services (Object Storage, Functions, AI Gateway) are unavailable here —
 * they currently require us-east-2.
 */
export default defineConfig({
  auth: true,
});
