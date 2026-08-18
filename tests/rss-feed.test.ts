import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/rss.xml/route";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { RSS_PATH, SITE_ORIGIN } from "@/lib/metadata";
import {
  createRssXml,
  escapeXml,
  getFullPostHtml,
  getFullPostText,
  RSS_FEED_ITEMS,
} from "@/lib/rss";

function itemBlocks(xml: string): string[] {
  return [...xml.matchAll(/<item>[\s\S]*?<\/item>/gu)].map(
    (match) => match[0],
  );
}

describe("RSS 2.0 full-body feed", () => {
  it("escapes XML metacharacters deterministically", () => {
    expect(escapeXml("A&B <C> \"D\" 'E'")).toBe(
      "A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;",
    );
  });

  it("contains exactly two canonical posts with permanent URL GUIDs", () => {
    const expectedUrls = BLOG_POSTS.map((post) =>
      new URL(getBlogPostPath(post), SITE_ORIGIN).href,
    );
    expect(RSS_FEED_ITEMS).toHaveLength(2);
    expect(new Set(RSS_FEED_ITEMS.map((item) => item.link))).toEqual(
      new Set(expectedUrls),
    );
    expect(RSS_FEED_ITEMS.every((item) => item.guid === item.link)).toBe(true);
    expect(new Set(RSS_FEED_ITEMS.map((item) => item.guid)).size).toBe(2);
    expect(
      RSS_FEED_ITEMS.every(
        (item) => new URL(item.link).origin === SITE_ORIGIN,
      ),
    ).toBe(true);
  });

  it("publishes every article section and checklist from source dates", () => {
    const xml = createRssXml();
    const blocks = itemBlocks(xml);
    expect(blocks).toHaveLength(BLOG_POSTS.length);
    expect(xml).toContain(
      'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    );
    for (const post of BLOG_POSTS) {
      const link = new URL(getBlogPostPath(post), SITE_ORIGIN).href;
      const block = blocks.find((candidate) =>
        candidate.includes("<link>" + link + "</link>"),
      );
      expect(block).toBeDefined();
      expect(block).toContain(
        "<pubDate>" + new Date(post.publishedAt).toUTCString() + "</pubDate>",
      );
      expect(block).toContain(
        "<description>" + escapeXml(post.description) + "</description>",
      );
      expect(block).toContain("<content:encoded><![CDATA[<article>");
      expect(block).toContain(post.intro);
      for (const section of post.sections) {
        expect(block).toContain(section.heading);
        for (const paragraph of section.paragraphs) {
          expect(block).toContain(paragraph);
        }
      }
      for (const entry of post.checklist) {
        expect(block).toContain(entry);
      }
      const item = RSS_FEED_ITEMS.find((candidate) => candidate.link === link);
      expect(item?.bodyText).toBe(getFullPostText(post));
      expect(item?.bodyHtml).toBe(getFullPostHtml(post));
    }
  });

  it("uses the latest real modified date rather than the build clock", () => {
    const latest = BLOG_POSTS.reduce<string>((value, post) =>
      Date.parse(post.modifiedAt) > Date.parse(value)
        ? post.modifiedAt
        : value,
    BLOG_POSTS[0].modifiedAt);
    const xml = createRssXml();
    expect(xml).toContain(
      "<lastBuildDate>" + new Date(latest).toUTCString() + "</lastBuildDate>",
    );
  });

  it("serves the static feed with the correct media type", async () => {
    const response = GET();
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/rss+xml; charset=utf-8",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new TextEncoder().encode(xml).byteLength).toBeLessThan(
      10 * 1024 * 1024,
    );
    expect(xml).toContain(
      '<atom:link href="' +
        new URL(RSS_PATH, SITE_ORIGIN).href +
        '" rel="self" type="application/rss+xml" />',
    );
    const netlify = readFileSync("netlify.toml", "utf8");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(netlify).toContain('for = "/rss.xml"');
    expect(netlify).toContain(
      'Content-Type = "application/rss+xml; charset=utf-8"',
    );
    expect(layout).toContain('rel="alternate"');
    expect(layout).toContain('type="application/rss+xml"');
  });
});
