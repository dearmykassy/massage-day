import { BLOG_POSTS, getBlogPostPath, type BlogPost } from "@/data/blog-posts";
import { RSS_PATH, SITE_NAME, SITE_ORIGIN } from "@/lib/metadata";

export type RssFeedItem = {
  title: string;
  link: string;
  guid: string;
  category: string;
  summary: string;
  bodyText: string;
  bodyHtml: string;
  publishedAt: string;
  modifiedAt: string;
};

export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function getFullPostText(post: BlogPost): string {
  return [
    post.intro,
    ...post.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
    "전화 전에 확인할 메모",
    ...post.checklist,
  ].join("\n\n");
}

export function getFullPostHtml(post: BlogPost): string {
  const sections = post.sections
    .map(
      (section) =>
        `<section><h2>${escapeXml(section.heading)}</h2>${section.paragraphs
          .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
          .join("")}</section>`,
    )
    .join("");
  const checklist = post.checklist
    .map((item) => `<li>${escapeXml(item)}</li>`)
    .join("");
  return `<article><p>${escapeXml(post.intro)}</p>${sections}<section><h2>전화 전에 확인할 메모</h2><ul>${checklist}</ul></section></article>`;
}

export const RSS_FEED_ITEMS: readonly RssFeedItem[] = BLOG_POSTS.map((post) => {
  const link = new URL(getBlogPostPath(post), SITE_ORIGIN).href;
  return {
    title: post.title,
    link,
    guid: link,
    category: post.category,
    summary: post.description,
    bodyText: getFullPostText(post),
    bodyHtml: getFullPostHtml(post),
    publishedAt: post.publishedAt,
    modifiedAt: post.modifiedAt,
  };
}).sort(
  (left, right) =>
    Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt) ||
    left.link.localeCompare(right.link),
);

function toRfc822(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`MASSAGE_DAY_RSS_INVALID_DATE:${value}`);
  }
  return date.toUTCString();
}

function cdata(value: string): string {
  return value.replaceAll("]]>", "]]]]><![CDATA[>");
}

function renderItem(item: RssFeedItem): string {
  return [
    "    <item>",
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.link)}</link>`,
    `      <description>${escapeXml(item.summary)}</description>`,
    `      <content:encoded><![CDATA[${cdata(item.bodyHtml)}]]></content:encoded>`,
    `      <category>${escapeXml(item.category)}</category>`,
    `      <pubDate>${escapeXml(toRfc822(item.publishedAt))}</pubDate>`,
    `      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`,
    "    </item>",
  ].join("\n");
}

export function createRssXml(
  items: readonly RssFeedItem[] = RSS_FEED_ITEMS,
): string {
  if (items.length === 0) throw new Error("MASSAGE_DAY_RSS_EMPTY");
  const first = items[0];
  if (!first) throw new Error("MASSAGE_DAY_RSS_EMPTY");
  const lastBuildDate = items.reduce(
    (latest, item) =>
      Date.parse(item.modifiedAt) > Date.parse(latest)
        ? item.modifiedAt
        : latest,
    first.modifiedAt,
  );
  const feedUrl = new URL(RSS_PATH, SITE_ORIGIN).href;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    "  <channel>",
    `    <title>${escapeXml(`${SITE_NAME} 이용 기록`)}</title>`,
    `    <link>${escapeXml(new URL("/", SITE_ORIGIN).href)}</link>`,
    `    <description>${escapeXml(`${SITE_NAME}가 직접 작성한 전화 준비와 이용 확인 글`)}</description>`,
    "    <language>ko-KR</language>",
    `    <lastBuildDate>${escapeXml(toRfc822(lastBuildDate))}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items.map(renderItem),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
