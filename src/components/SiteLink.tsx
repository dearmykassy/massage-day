import NextLink from "next/link";
import type { ComponentProps } from "react";

import { resolveSiteLinkPrefetch } from "@/lib/link-prefetch";

export type SiteLinkProps = ComponentProps<typeof NextLink>;

/**
 * The site's single internal-link boundary. NextLink still renders a real
 * anchor and preserves navigation, handlers and ARIA props; only production
 * prefetching is forced off.
 */
export default function SiteLink({ prefetch, ...props }: SiteLinkProps) {
  return (
    <NextLink
      {...props}
      prefetch={resolveSiteLinkPrefetch(prefetch, process.env.NODE_ENV)}
    />
  );
}
