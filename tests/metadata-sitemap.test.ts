import { describe, expect, it } from "vitest";
import { metadataContract as areasMetadata } from "@/app/areas/page";
import { metadataContract as blogMetadata } from "@/app/blog/page";
import { metadataContract as guideMetadata } from "@/app/guide/page";
import { metadataContract as noticeMetadata } from "@/app/notice/page";
import { metadataContract as homeMetadata } from "@/app/page";
import { metadata as rootMetadata } from "@/app/layout";
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
  RSS_PATH,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_RELEASED_AT,
  SITE_ROBOTS,
  SITEMAP_PATH,
  toNextMetadata,
} from "@/lib/metadata";
import { createRegionPageModel } from "@/lib/region-page-model";
import {
  createRegionPageJsonLd,
  serializeRegionPageJsonLd,
} from "@/lib/region-schema";
import { ACTIVE_REGION_NODES, usesConciseRegionHeading } from "@/lib/regions";
import {
  FIXED_AND_COMPACT_CONTENT_MODIFIED_AT,
  HOME_AREAS_AND_BROAD_CONTENT_MODIFIED_AT,
} from "@/lib/site-revisions";

const FIXED_CONTRACTS = [
  homeMetadata,
  areasMetadata,
  pricingMetadata,
  guideMetadata,
  noticeMetadata,
  blogMetadata,
];

describe("production metadata contract", () => {
  it("emits the exact Naver ownership verification value from the root layout", () => {
    expect(rootMetadata.verification).toEqual({
      other: {
        "naver-site-verification": "e4336b3a46780c9dc349116dc3c43c84c4cae1eb",
      },
    });
  });

  it("uses the approved production origin and allows deployment and indexing", () => {
    expect(SITE_ORIGIN).toBe("https://msgday.kr");
    expect(DEPLOYMENT_CONTRACT).toEqual({
      deploymentAllowed: true,
      deploymentBlockers: [],
      origin: SITE_ORIGIN,
      sitemapUrl: new URL(SITEMAP_PATH, SITE_ORIGIN).href,
      rssUrl: new URL(RSS_PATH, SITE_ORIGIN).href,
      robots: "index,follow",
    });
    const robotsValue = robots();
    expect(robotsValue.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(robotsValue.sitemap).toBe("https://msgday.kr/sitemap.xml");
    expect(robotsValue.host).toBe("https://msgday.kr");
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
      expect(emitted.robots).toEqual(SITE_ROBOTS);
    }
  });

  it("keeps both blog posts self-canonical and indexable", () => {
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
      expect(emitted.robots).toEqual(SITE_ROBOTS);

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
      expect(toNextMetadata(contract).robots).toEqual(SITE_ROBOTS);
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

    expect(SITE_RELEASED_AT).toBe(FIXED_AND_COMPACT_CONTENT_MODIFIED_AT);
    const byUrl = new Map(output.map((entry) => [entry.url, entry]));
    for (const path of FIXED_SITEMAP_PATHS) {
      const expected =
        path === "/" || path === "/areas/"
          ? HOME_AREAS_AND_BROAD_CONTENT_MODIFIED_AT
          : FIXED_AND_COMPACT_CONTENT_MODIFIED_AT;
      expect(byUrl.get(new URL(path, SITE_ORIGIN).href)?.lastModified).toEqual(
        new Date(expected),
      );
    }
    for (const post of BLOG_POSTS) {
      expect(
        byUrl.get(new URL(getBlogPostPath(post), SITE_ORIGIN).href)?.lastModified,
      ).toEqual(new Date(post.modifiedAt));
    }

    let broadCount = 0;
    let compactCount = 0;
    for (const node of ACTIVE_REGION_NODES) {
      const broad = usesConciseRegionHeading(node);
      broadCount += Number(broad);
      compactCount += Number(!broad);
      const expected = broad
        ? HOME_AREAS_AND_BROAD_CONTENT_MODIFIED_AT
        : FIXED_AND_COMPACT_CONTENT_MODIFIED_AT;
      expect(
        byUrl.get(new URL(`${node.path}/`, SITE_ORIGIN).href)?.lastModified,
      ).toEqual(new Date(expected));
    }
    expect({ broadCount, compactCount }).toEqual({
      broadCount: 41,
      compactCount: 1250,
    });
    expect(
      output.every(
        (entry) =>
          entry.lastModified instanceof Date &&
          !Number.isNaN(entry.lastModified.getTime()) &&
          !("changeFrequency" in entry) &&
          !("priority" in entry),
      ),
    ).toBe(true);
  });
});
