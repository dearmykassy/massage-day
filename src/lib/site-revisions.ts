import { SITE_RELEASED_AT } from "@/lib/metadata";

/**
 * Stable public-content revisions for sitemap.xml. These values are evidenced
 * Git commit author dates, never build or request time. Update only the route
 * group whose visible content, metadata, structured data or links changed.
 */
/** c63b51a1 — msgday.kr public launch for fixed and compact routes. */
export const FIXED_AND_COMPACT_CONTENT_MODIFIED_AT = SITE_RELEASED_AT;
/** f7daede7 — homepage hero headline revision. */
export const HOME_CONTENT_MODIFIED_AT = "2026-08-19T05:46:22+09:00" as const;
/** 51ee29d8 — /areas and all 41 broad-route visible-copy revision. */
export const AREAS_AND_BROAD_CONTENT_MODIFIED_AT =
  "2026-08-19T02:24:42+09:00" as const;
/** e43ef67d — all 1,291 regional service-content and metadata revision. */
export const REGIONAL_CONTENT_MODIFIED_AT =
  "2026-08-19T23:36:06+09:00" as const;
