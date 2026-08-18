import type { MetadataRoute } from "next";
import { SITE_ORIGIN, SITEMAP_PATH } from "@/lib/metadata";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL(SITEMAP_PATH, SITE_ORIGIN).href,
    host: SITE_ORIGIN,
  };
}
