import { describe, expect, it } from "vitest";
import { metadataContract as areasMetadata } from "@/app/areas/page";
import { metadataContract as blogMetadata } from "@/app/blog/page";
import { metadataContract as guideMetadata } from "@/app/guide/page";
import { metadataContract as noticeMetadata } from "@/app/notice/page";
import { metadataContract as homeMetadata } from "@/app/page";
import { metadataContract as pricingMetadata } from "@/app/pricing/page";
import robots from "@/app/robots";
import sitemap, { FIXED_SITEMAP_PATHS } from "@/app/sitemap";
import {
  BLOG_POSTS,
  createBlogMetadata,
  getBlogPostPath,
} from "@/data/blog-posts";
import { createBlogPostingJsonLd } from "@/lib/blog-schema";
import { createRegionContent } from "@/lib/content";
import {
  createRouteMetadataContract,
  DEPLOYMENT_CONTRACT,
  PREVIEW_ROBOTS,
  RSS_PATH,
  SITE_NAME,
  SITE_ORIGIN,
  SITEMAP_PATH,
  toNextMetadata,
} from "@/lib/metadata";
import { createRegionPageModel } from "@/lib/region-page-model";
import {
  createRegionPageJsonLd,
  serializeRegionPageJsonLd,
} from "@/lib/region-schema";
import { ACTIVE_REGION_NODES } from "@/lib/regions";

const FIXED_CONTRACTS = [
  homeMetadata,
  areasMetadata,
  pricingMetadata,
  guideMetadata,
  noticeMetadata,
  blogMetadata,
];

describe("preview metadata contract", () => {
  it("keeps the invalid preview origin and blocks deployment and indexing", () => {
    expect(SITE_ORIGIN).toBe("https://preview.massage-day.invalid");
    expect(DEPLOYMENT_CONTRACT).toEqual({
      deploymentAllowed: false,
      deploymentBlockers: ["PRODUCTION_DOMAIN_NOT_SET"],
      origin: SITE_ORIGIN,
      sitemapUrl: new URL(SITEMAP_PATH, SITE_ORIGIN).href,
      rssUrl: new URL(RSS_PATH, SITE_ORIGIN).href,
      robots: "noindex,nofollow,nocache",
    });
    const robotsValue = robots();
    expect(robotsValue.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robotsValue.sitemap).toBe(
      "https://preview.massage-day.invalid/sitemap.xml",
    );
    expect(robotsValue.host).toBe("https://preview.massage-day.invalid");
  });

  it("emits complete self-canonical metadata on all six fixed pages", () => {
    expect(FIXED_CONTRACTS).toHaveLength(FIXED_SITEMAP_PATHS.length);
    for (const contract of FIXED_CONTRACTS) {
      expect(contract.title.trim().length).toBeGreaterThan(10);
      expect(contract.description.trim().length).toBeGreaterThan(30);
      expect(contract.keywords.length).toBeGreaterThanOrEqual(4);
      expect(contract.title).toContain(SITE_NAME);
      expect(contract.canonical.startsWith(SITE_ORIGIN)).toBe(true);
      const emitted = toNextMetadata(contract);
      expect(emitted.description).toBe(contract.description);
      expect(emitted.keywords).toEqual(contract.keywords);
      expect(emitted.alternates).toEqual({ canonical: contract.canonical });
      expect(emitted.openGraph).toMatchObject({
        title: contract.title,
        description: contract.description,
        url: contract.canonical,
      });
      expect(emitted.twitter).toMatchObject({
        title: contract.title,
        description: contract.description,
      });
      expect(emitted.robots).toEqual(PREVIEW_ROBOTS);
    }
  });

  it("keeps both blog posts self-canonical and noindex", () => {
    for (const post of BLOG_POSTS) {
      const emitted = createBlogMetadata(post);
      expect(emitted.title).toMatchObject({
        absolute: expect.stringContaining(SITE_NAME),
      });
      expect(emitted.description).toBe(post.description);
      expect(emitted.keywords).toEqual([...post.keywords]);
      expect(emitted.alternates).toEqual({
        canonical: new URL(getBlogPostPath(post), SITE_ORIGIN).href,
      });
      expect(emitted.openGraph).toMatchObject({
        title: expect.stringContaining(SITE_NAME),
        description: post.description,
        url: new URL(getBlogPostPath(post), SITE_ORIGIN).href,
      });
      expect(emitted.twitter).toMatchObject({
        title: expect.stringContaining(SITE_NAME),
        description: post.description,
      });
      expect(emitted.robots).toEqual(PREVIEW_ROBOTS);

      const schema = createBlogPostingJsonLd(post);
      expect(schema).toMatchObject({
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        url: new URL(getBlogPostPath(post), SITE_ORIGIN).href,
        datePublished: post.publishedAt,
        dateModified: post.modifiedAt,
        inLanguage: "ko-KR",
        image: {
          "@type": "ImageObject",
          url: new URL(post.image.src, SITE_ORIGIN).href,
          caption: post.image.alt,
        },
      });
    }
  });

  it("emits complete unique metadata for all regional routes", () => {
    const contracts = ACTIVE_REGION_NODES.map((node) => {
      const content = createRegionContent(node);
      return createRouteMetadataContract(
        node.path + "/",
        content.title,
        content.description,
        content.keywords,
      );
    });
    expect(new Set(contracts.map((item) => item.title)).size).toBe(1291);
    expect(new Set(contracts.map((item) => item.description)).size).toBe(1291);
    expect(new Set(contracts.map((item) => item.canonical)).size).toBe(1291);
    for (const contract of contracts) {
      expect(contract.title.length).toBeGreaterThanOrEqual(20);
      expect(contract.description.length).toBeGreaterThanOrEqual(70);
      expect(contract.keywords).toHaveLength(8);
      expect(contract.openGraph.title).toBe(contract.title);
      expect(contract.twitter.description).toBe(contract.description);
      expect(toNextMetadata(contract).robots).toEqual(PREVIEW_ROBOTS);
    }
  });

  it("keeps title, description and keyword arrays unique across 1,299 pages", () => {
    const fixedRecords = FIXED_CONTRACTS.map((contract) => ({
      title: contract.title,
      description: contract.description,
      keywords: JSON.stringify(contract.keywords),
    }));
    const blogRecords = BLOG_POSTS.map((post) => ({
      title: post.title + " | " + SITE_NAME,
      description: post.description,
      keywords: JSON.stringify(post.keywords),
    }));
    const regionRecords = ACTIVE_REGION_NODES.map((node) => {
      const content = createRegionContent(node);
      return {
        title: content.title,
        description: content.description,
        keywords: JSON.stringify(content.keywords),
      };
    });
    const records = [...fixedRecords, ...blogRecords, ...regionRecords];
    expect(records).toHaveLength(1299);
    expect(new Set(records.map((item) => item.title)).size).toBe(1299);
    expect(new Set(records.map((item) => item.description)).size).toBe(1299);
    expect(new Set(records.map((item) => item.keywords)).size).toBe(1299);
  });
});

describe("regional structured data", () => {
  it("emits only WebPage and BreadcrumbList graph nodes from visible copy", () => {
    const samples = [
      ACTIVE_REGION_NODES[0],
      ACTIVE_REGION_NODES.find((node) => node.kind === "hub"),
      ACTIVE_REGION_NODES.find((node) => node.kind === "representative"),
    ].filter((node) => node !== undefined);
    for (const node of samples) {
      const model = createRegionPageModel(node);
      const schema = createRegionPageJsonLd(node);
      expect(schema["@graph"].map((item) => item["@type"])).toEqual([
        "WebPage",
        "BreadcrumbList",
      ]);
      const [webPage, breadcrumbs] = schema["@graph"];
      expect(webPage.name).toBe(model.content.h1);
      expect(webPage.description).toBe(model.content.description);
      expect(webPage.url).toBe(new URL(node.path + "/", SITE_ORIGIN).href);
      expect(webPage.inLanguage).toBe("ko-KR");
      expect(webPage.isPartOf).toEqual({
        "@type": "WebSite",
        "@id": new URL("/#website", SITE_ORIGIN).href,
        url: new URL("/", SITE_ORIGIN).href,
        name: SITE_NAME,
      });
      expect(breadcrumbs.itemListElement).toEqual(
        model.breadcrumbs.map((breadcrumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: breadcrumb.name,
          item: new URL(
            breadcrumb.path.replace(/\/+$/u, "") + "/",
            SITE_ORIGIN,
          ).href,
        })),
      );
      const serialized = JSON.stringify(schema);
      for (const forbidden of [
        "LocalBusiness",
        "Offer",
        "Review",
        "Rating",
        "FAQPage",
        "aggregateRating",
        "GeoCoordinates",
        "Map",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it("escapes less-than signs in the JSON-LD serializer", () => {
    const base = ACTIVE_REGION_NODES.find(
      (node) => node.kind === "representative",
    );
    expect(base).toBeDefined();
    const synthetic = {
      ...base!,
      displayName: "<주소>",
      qualifiedName: "검증 <주소>",
    };
    const serialized = serializeRegionPageJsonLd(synthetic);
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c주소>");
  });
});

describe("sitemap", () => {
  it("matches six fixed routes, two posts and all active regions", () => {
    const output = sitemap();
    const urls = output.map((entry) => entry.url);
    expect(urls).toHaveLength(1299);
    expect(new Set(urls).size).toBe(1299);
    const expectedPaths = [
      ...FIXED_SITEMAP_PATHS,
      ...BLOG_POSTS.map(getBlogPostPath),
      ...ACTIVE_REGION_NODES.map((node) => node.path + "/"),
    ];
    expect(new Set(urls)).toEqual(
      new Set(expectedPaths.map((entry) => new URL(entry, SITE_ORIGIN).href)),
    );
  });
});
