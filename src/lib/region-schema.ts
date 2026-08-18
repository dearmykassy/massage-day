import { SITE_NAME, SITE_ORIGIN } from "@/lib/metadata";
import { createRegionPageModel } from "@/lib/region-page-model";
import type { RegionNode } from "@/lib/regions";

export type RegionPageJsonLd = {
  "@context": "https://schema.org";
  "@graph": [
    {
      "@type": "WebPage";
      "@id": string;
      url: string;
      name: string;
      description: string;
      inLanguage: "ko-KR";
      isPartOf: {
        "@type": "WebSite";
        "@id": string;
        url: string;
        name: typeof SITE_NAME;
      };
    },
    {
      "@type": "BreadcrumbList";
      "@id": string;
      itemListElement: Array<{
        "@type": "ListItem";
        position: number;
        name: string;
        item: string;
      }>;
    },
  ];
};

function absolutePageUrl(path: string): string {
  const normalized = path === "/" ? "/" : `${path.replace(/\/+$/u, "")}/`;
  return new URL(normalized, SITE_ORIGIN).href;
}

export function createRegionPageJsonLd(node: RegionNode): RegionPageJsonLd {
  const model = createRegionPageModel(node);
  const url = absolutePageUrl(node.path);
  const websiteUrl = new URL("/", SITE_ORIGIN).href;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: model.content.h1,
        description: model.content.description,
        inLanguage: "ko-KR",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${websiteUrl}#website`,
          url: websiteUrl,
          name: SITE_NAME,
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: model.breadcrumbs.map((breadcrumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: breadcrumb.name,
          item: absolutePageUrl(breadcrumb.path),
        })),
      },
    ],
  };
}

export function serializeRegionPageJsonLd(node: RegionNode): string {
  return JSON.stringify(createRegionPageJsonLd(node)).replace(/</gu, "\\u003c");
}
