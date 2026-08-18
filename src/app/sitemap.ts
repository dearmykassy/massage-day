import type { MetadataRoute } from "next";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { SITE_ORIGIN } from "@/lib/metadata";
import { ACTIVE_REGION_NODES, usesConciseRegionHeading } from "@/lib/regions";
import {
  FIXED_AND_COMPACT_CONTENT_MODIFIED_AT,
  HOME_AREAS_AND_BROAD_CONTENT_MODIFIED_AT,
} from "@/lib/site-revisions";

export const dynamic = "force-static";

export const FIXED_SITEMAP_PATHS = ["/", "/areas/", "/pricing/", "/guide/", "/notice/", "/blog/"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const records = [
    ...FIXED_SITEMAP_PATHS.map((path) => ({
      path,
      lastModified:
        path === "/" || path === "/areas/"
          ? HOME_AREAS_AND_BROAD_CONTENT_MODIFIED_AT
          : FIXED_AND_COMPACT_CONTENT_MODIFIED_AT,
    })),
    ...BLOG_POSTS.map((post) => ({ path: getBlogPostPath(post), lastModified: post.modifiedAt })),
    ...ACTIVE_REGION_NODES.map((node) => ({
      path: `${node.path}/`,
      lastModified: usesConciseRegionHeading(node)
        ? HOME_AREAS_AND_BROAD_CONTENT_MODIFIED_AT
        : FIXED_AND_COMPACT_CONTENT_MODIFIED_AT,
    })),
  ];

  return records.map(({ path, lastModified }) => ({
    url: new URL(path, SITE_ORIGIN).href,
    lastModified: new Date(lastModified),
  }));
}
