import { createRssXml } from "@/lib/rss";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(createRssXml(), {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/rss+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
