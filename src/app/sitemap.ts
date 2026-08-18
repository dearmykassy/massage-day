import type { MetadataRoute } from "next";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { SITE_ORIGIN, SITE_RELEASED_AT } from "@/lib/metadata";
import { ACTIVE_REGION_NODES } from "@/lib/regions";

export const dynamic = "force-static";

export const FIXED_SITEMAP_PATHS = ["/", "/areas/", "/pricing/", "/guide/", "/notice/", "/blog/"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const records = [
    ...FIXED_SITEMAP_PATHS.map((path) => ({ path, lastModified: SITE_RELEASED_AT })),
    ...BLOG_POSTS.map((post) => ({ path: getBlogPostPath(post), lastModified: post.modifiedAt })),
    ...ACTIVE_REGION_NODES.map((node) => ({ path: `${node.path}/`, lastModified: SITE_RELEASED_AT })),
  ];

  return records.map(({ path, lastModified }) => ({
    url: new URL(path, SITE_ORIGIN).href,
    lastModified: new Date(lastModified),
    changeFrequency: path.startsWith("/blog/") ? "monthly" as const : "weekly" as const,
    priority: path === "/" ? 1 : path.startsWith("/areas/") ? 0.8 : path.startsWith("/blog/") ? 0.65 : 0.6,
  }));
}
