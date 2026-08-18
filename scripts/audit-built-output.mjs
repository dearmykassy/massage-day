import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");
const PRODUCTION_ORIGIN = "https://msgday.kr";
const EXPECTED_PUBLIC_PAGES = 1_299;
const EXPECTED_REGION_PAGES = 1_291;
const EXPECTED_REGIONAL_ASSETS = 216;
const EXPECTED_REGIONAL_WEBPS = 648;
const EXPECTED_RSS_ITEMS = 2;
const NAVER_HTTPS_TOKEN = "e4336b3a46780c9dc349116dc3c43c84c4cae1eb";
const NAVER_HTTP_TOKEN = "96effac4a012f26f5aad2616d58c159cdcfc2a87";
const NAVER_HTTPS_FILE = "naverf76d996ba16d8e0fc251624cf0ebcd0e.html";

function fail(code) {
  throw new Error(`MASSAGE_DAY_BUILT_OUTPUT_${code}`);
}

async function walk(directory) {
  const output = [];
  for (const name of await readdir(directory)) {
    const absolute = path.join(directory, name);
    const metadata = await stat(absolute);
    if (metadata.isDirectory()) output.push(...await walk(absolute));
    else output.push(absolute);
  }
  return output;
}

const files = await walk(OUT);
const htmlFiles = files.filter((file) => path.basename(file) === "index.html");
const publicHtml = htmlFiles.filter((file) => !file.includes("/_not-found/") && !file.includes("/404/"));
const regionHtml = publicHtml.filter(
  (file) => file.includes("/areas/") && file !== path.join(OUT, "areas", "index.html"),
);

if (publicHtml.length !== EXPECTED_PUBLIC_PAGES) fail(`PUBLIC_PAGE_COUNT:${publicHtml.length}`);
if (regionHtml.length !== EXPECTED_REGION_PAGES) fail(`REGION_PAGE_COUNT:${regionHtml.length}`);

const originPattern = PRODUCTION_ORIGIN.replaceAll(".", "\\.");
const metadataChecks = {
  title: /<title>[^<]+<\/title>/u,
  description: /<meta name="description" content="[^"]+"\/>/u,
  keywords: /<meta name="keywords" content="[^"]+"\/>/u,
  canonical: new RegExp(`<link rel="canonical" href="${originPattern}/[^"]*"\\/>`, "u"),
  openGraphTitle: /<meta property="og:title" content="[^"]+"\/>/u,
  openGraphDescription: /<meta property="og:description" content="[^"]+"\/>/u,
  openGraphUrl: /<meta property="og:url" content="[^"]+"\/>/u,
  twitterTitle: /<meta name="twitter:title" content="[^"]+"\/>/u,
  twitterDescription: /<meta name="twitter:description" content="[^"]+"\/>/u,
  index: /<meta name="robots" content="[^"]*index[^"]*"\/>/u,
  follow: /<meta name="robots" content="[^"]*follow[^"]*"\/>/u,
};
const forbiddenBrands = /혼혈마사지|건마에반하다|필링홈타이|랑테라피|마사지봄|마사지러브|콜미토닥이|GEONMAE BANHADA|geonmae-banhada|honhyeol-massage|gmb-t4|hym-t4/iu;
const unsupportedLocalClaims = /위치 지도|세부 매장 권역|이용이 많은 장소|지역별 이용량|도착\s*시간|도착 예정|(?:^|[^\p{L}])이동\s*시간/u;
const bannedTone = /최고|완벽|프리미엄|특별한|맞춤|섬세한|여유롭게|부담 없이|한눈에|나만의/u;
const seenTitles = new Set();
const seenDescriptions = new Set();
const seenCanonicals = new Set();

function expectedCanonicalForHtml(file) {
  const relative = path.relative(OUT, file);
  if (relative === "index.html") return `${PRODUCTION_ORIGIN}/`;
  const directory = path.dirname(relative).split(path.sep).join("/");
  return new URL(`/${directory}/`, PRODUCTION_ORIGIN).href;
}

for (const file of publicHtml) {
  const relative = path.relative(OUT, file);
  const html = await readFile(file, "utf8");
  for (const [field, pattern] of Object.entries(metadataChecks)) {
    if (!pattern.test(html)) fail(`META_${field.toUpperCase()}:${relative}`);
  }
  const naverMetaValues = [
    ...html.matchAll(/<meta name="naver-site-verification" content="([^"]+)"\/>/gu),
  ].map((match) => match[1]);
  if (naverMetaValues.length !== 1 || naverMetaValues[0] !== NAVER_HTTPS_TOKEN) {
    fail(`META_NAVER_VERIFICATION:${relative}:${naverMetaValues.join(",")}`);
  }
  if (html.includes(NAVER_HTTP_TOKEN)) fail(`META_NAVER_HTTP_TOKEN:${relative}`);
  if (forbiddenBrands.test(html)) fail(`OLD_BRAND:${relative}`);
  if (html.includes("preview.massage-day.invalid") || /noindex|nofollow/iu.test(html)) {
    fail(`PREVIEW_RESIDUE:${relative}`);
  }
  if (unsupportedLocalClaims.test(html)) fail(`UNSUPPORTED_LOCAL_CLAIM:${relative}`);
  if (bannedTone.test(html)) fail(`BANNED_TONE:${relative}`);
  const h1Count = html.match(/<h1(?:\s[^>]*)?>/gu)?.length ?? 0;
  if (h1Count !== 1) fail(`H1_COUNT:${h1Count}:${relative}`);

  const title = html.match(/<title>([^<]+)<\/title>/u)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"\/>/u)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"\/>/u)?.[1];
  if (!title || seenTitles.has(title)) fail(`TITLE_DUPLICATE:${relative}`);
  if (!description || seenDescriptions.has(description)) fail(`DESCRIPTION_DUPLICATE:${relative}`);
  if (!canonical || seenCanonicals.has(canonical)) fail(`CANONICAL_DUPLICATE:${relative}`);
  if (canonical !== expectedCanonicalForHtml(file)) fail(`CANONICAL_ROUTE:${relative}`);
  seenTitles.add(title);
  seenDescriptions.add(description);
  seenCanonicals.add(canonical);
}

const sitemap = await readFile(path.join(OUT, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => match[1]);
const sitemapLastModified = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/gu)].map((match) => match[1]);
if (sitemapUrls.length !== EXPECTED_PUBLIC_PAGES || new Set(sitemapUrls).size !== EXPECTED_PUBLIC_PAGES) {
  fail(`SITEMAP_COUNT:${sitemapUrls.length}:${new Set(sitemapUrls).size}`);
}
if (sitemapUrls.some((url) => !url.startsWith(`${PRODUCTION_ORIGIN}/`))) fail("SITEMAP_HOST");
if (
  sitemapLastModified.length !== EXPECTED_PUBLIC_PAGES ||
  sitemapLastModified.some((value) => Number.isNaN(Date.parse(value)))
) fail(`SITEMAP_LASTMOD:${sitemapLastModified.length}`);
if (/<(?:changefreq|priority)>/u.test(sitemap)) fail("SITEMAP_IGNORED_HINTS");
if (sitemapUrls.some((url) => url !== `${PRODUCTION_ORIGIN}/` && !url.endsWith("/"))) {
  fail("SITEMAP_TRAILING_SLASH");
}
if (
  JSON.stringify([...sitemapUrls].sort()) !==
  JSON.stringify([...seenCanonicals].sort())
) fail("SITEMAP_CANONICAL_SET");

const robots = await readFile(path.join(OUT, "robots.txt"), "utf8");
if (
  !robots.includes("Allow: /") ||
  robots.includes("Disallow: /") ||
  !robots.includes(`Host: ${PRODUCTION_ORIGIN}`) ||
  !robots.includes(`${PRODUCTION_ORIGIN}/sitemap.xml`)
) fail("ROBOTS_PRODUCTION_GATE");

const naverHttpsFile = await readFile(path.join(OUT, NAVER_HTTPS_FILE), "utf8");
if (naverHttpsFile !== `naver-site-verification: ${NAVER_HTTPS_FILE}\n`) {
  fail("NAVER_HTTPS_FILE");
}
if (files.some((file) => path.basename(file) === "naver2539e3fc5e851edfe21409b1ed746c72.html")) {
  fail("NAVER_HTTP_FILE");
}

const rss = await readFile(path.join(OUT, "rss.xml"), "utf8");
if (Buffer.byteLength(rss, "utf8") >= 10 * 1024 * 1024) fail("RSS_SIZE");
const rssItems = [...rss.matchAll(/<item>[\s\S]*?<\/item>/gu)].map((match) => match[0]);
const rssLinks = rssItems.map((item) => item.match(/<link>([^<]+)<\/link>/u)?.[1]);
const rssGuids = rssItems.map((item) => item.match(/<guid isPermaLink="true">([^<]+)<\/guid>/u)?.[1]);
if (
  rssItems.length !== EXPECTED_RSS_ITEMS ||
  new Set(rssLinks).size !== EXPECTED_RSS_ITEMS ||
  rssLinks.some((url) => !url?.startsWith(`${PRODUCTION_ORIGIN}/blog/`) || !sitemapUrls.includes(url)) ||
  JSON.stringify(rssGuids) !== JSON.stringify(rssLinks) ||
  rssItems.some((item) => !/<description>[^<]{40,}<\/description>/u.test(item)) ||
  rssItems.some((item) => !/<content:encoded><!\[CDATA\[[\s\S]{500,}\]\]><\/content:encoded>/u.test(item)) ||
  rssItems.some((item) => !/<pubDate>[^<]+ GMT<\/pubDate>/u.test(item)) ||
  !rss.includes(`atom:link href="${PRODUCTION_ORIGIN}/rss.xml"`) ||
  !rss.includes("<language>ko-KR</language>")
) fail("RSS");

const manifest = JSON.parse(await readFile(
  path.join(ROOT, "src/data/regional-image-assignments.template6.generated.json"),
  "utf8",
));
if (
  manifest.status !== "ROOT_APPROVED_RELEASED" ||
  manifest.platformKey !== "massage-day" ||
  manifest.distribution?.routes !== EXPECTED_REGION_PAGES ||
  manifest.distribution?.assets !== EXPECTED_REGIONAL_ASSETS ||
  manifest.distribution?.reusedRoutes !== 430 ||
  manifest.distribution?.newRoutes !== 861 ||
  manifest.distribution?.maxUses !== 6 ||
  manifest.distribution?.parentChildCollisions !== 0 ||
  manifest.distribution?.siblingCollisions !== 0 ||
  Object.keys(manifest.routes ?? {}).length !== EXPECTED_REGION_PAGES
) fail("REGIONAL_IMAGE_MANIFEST");

const releasedRoot = path.join(OUT, "assets/massage-day/template6-regional");
const releasedFiles = await walk(releasedRoot);
const webps = releasedFiles.filter((file) => file.endsWith(".webp"));
const provenance = releasedFiles.filter((file) => file.endsWith("provenance.json"));
if (webps.length !== EXPECTED_REGIONAL_WEBPS) fail(`REGIONAL_WEBP_COUNT:${webps.length}`);
if (provenance.length !== EXPECTED_REGIONAL_ASSETS) fail(`REGIONAL_PROVENANCE_COUNT:${provenance.length}`);
if (releasedFiles.some((file) => /template[345]|honhyeol|geonmae|rang-therapy/iu.test(file))) {
  fail("REGIONAL_ASSET_RESIDUE");
}

for (const editorial of [
  "images/massage-day-template6/home/hero.webp",
  "images/massage-day-template6/blog/note-01.webp",
  "images/massage-day-template6/blog/note-02.webp",
]) {
  if (!files.includes(path.join(OUT, editorial))) fail(`EDITORIAL_IMAGE:${editorial}`);
}

console.log(JSON.stringify({
  status: "PASS",
  publicPages: publicHtml.length,
  regionPages: regionHtml.length,
  uniqueTitles: seenTitles.size,
  uniqueDescriptions: seenDescriptions.size,
  sitemapUrls: sitemapUrls.length,
  rssItems: rssItems.length,
  regionalAssets: manifest.distribution.assets,
  regionalWebps: webps.length,
}));
