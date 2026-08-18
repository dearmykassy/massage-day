import type { Metadata } from "next";

export const SITE_ORIGIN = "https://preview.massage-day.invalid";
export const SITE_NAME = "마사지데이";
export const SITEMAP_PATH = "/sitemap.xml";
export const RSS_PATH = "/rss.xml";
export const PREVIEW_ROBOTS = {
  index: false,
  follow: false,
  noarchive: true,
  nocache: true,
} as const;

export const DEPLOYMENT_CONTRACT = {
  deploymentAllowed: false,
  deploymentBlockers: ["PRODUCTION_DOMAIN_NOT_SET"] as readonly string[],
  origin: SITE_ORIGIN,
  sitemapUrl: new URL(SITEMAP_PATH, SITE_ORIGIN).href,
  rssUrl: new URL(RSS_PATH, SITE_ORIGIN).href,
  robots: "noindex,nofollow,nocache",
} as const;

export type RouteMetadataContract = {
  route: string;
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  openGraph: {
    type: "website";
    locale: "ko_KR";
    siteName: typeof SITE_NAME;
    title: string;
    description: string;
    url: string;
  };
  twitter: {
    card: "summary";
    title: string;
    description: string;
  };
};

function normalizedRoute(route: string): string {
  if (route === "/") return route;
  return `${route.replace(/^\/+|\/+$/gu, "")}/`.replace(/^/u, "/");
}

export function createRouteMetadataContract(
  route: string,
  title: string,
  description: string,
  keywords: readonly string[] = [],
): RouteMetadataContract {
  const normalized = normalizedRoute(route);
  const canonical = new URL(normalized, SITE_ORIGIN).href;
  return {
    route: normalized,
    title,
    description,
    keywords: [...keywords],
    canonical,
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function toNextMetadata(contract: RouteMetadataContract): Metadata {
  return {
    title: { absolute: contract.title },
    description: contract.description,
    keywords: contract.keywords.length > 0 ? contract.keywords : undefined,
    alternates: { canonical: contract.canonical },
    openGraph: contract.openGraph,
    twitter: contract.twitter,
    robots: PREVIEW_ROBOTS,
  };
}
