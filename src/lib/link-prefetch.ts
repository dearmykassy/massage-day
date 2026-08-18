export type SiteLinkPrefetchValue = boolean | "auto" | null | undefined;

/**
 * Production App Router prefetches can turn every visible internal link into a
 * React Server Component (`?_rsc=`) crawl request. Preserve local-development
 * behavior, but disable both viewport and hover prefetching in production.
 */
export function resolveSiteLinkPrefetch(
  requested: SiteLinkPrefetchValue,
  environment: string | undefined,
): SiteLinkPrefetchValue {
  return environment === "production" ? false : requested;
}
