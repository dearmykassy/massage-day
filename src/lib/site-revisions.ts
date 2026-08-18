import { SITE_RELEASED_AT } from "@/lib/metadata";

/**
 * Stable public-content revisions for sitemap.xml. These values are evidenced
 * Git commit author dates, never build or request time. Update only the route
 * group whose visible content, metadata, structured data or links changed.
 */
/** c63b51a1 — msgday.kr public launch for fixed and compact routes. */
export const FIXED_AND_COMPACT_CONTENT_MODIFIED_AT = SITE_RELEASED_AT;
/** 51ee29d8 — home, /areas and all 41 broad-route visible-copy revision. */
export const HOME_AREAS_AND_BROAD_CONTENT_MODIFIED_AT =
  "2026-08-19T02:24:42+09:00" as const;
