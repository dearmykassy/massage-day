import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import {
  BROAD_DETAIL_SECTION_IDS,
  COMPACT_DETAIL_SECTION_IDS,
  createRegionContent,
  isBroadDetailRegion,
} from "../src/lib/content.ts";
import {
  ACTIVE_REGION_NODES,
  getKeywordRegionLabel,
} from "../src/lib/regions.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const TSX_BIN = path.join(ROOT, "node_modules/.bin/tsx");
const DOCUMENTS_ROOT = path.join(os.homedir(), "Documents");
const AUTHORITATIVE_REPOSITORIES = [
  {
    id: "massagebom",
    root: path.join(DOCUMENTS_ROOT, "Services/msgbom"),
    mode: "massagebom-runtime",
  },
  {
    id: "massage-love",
    root: path.join(DOCUMENTS_ROOT, "Services/massagelove"),
    mode: "snapshot",
    snapshot: "src/data/region-content.generated.json",
  },
  {
    id: "callme-todaki",
    root: path.join(DOCUMENTS_ROOT, "Codex/callme-todaki"),
    mode: "snapshot",
    snapshot: "src/data/region-content.generated.json",
  },
  {
    id: "rang-therapy",
    root: path.join(DOCUMENTS_ROOT, "Codex/rang-therapy-seo-release"),
    mode: "content-runtime",
  },
  {
    id: "feeling-hometai",
    root: path.join(DOCUMENTS_ROOT, "Codex/feeling-hometai"),
    mode: "content-runtime",
  },
  {
    id: "geonmae-banhada",
    root: path.join(DOCUMENTS_ROOT, "Codex/geonmae-banhada"),
    mode: "content-runtime",
  },
  {
    id: "honhyeol-massage",
    root: path.join(DOCUMENTS_ROOT, "Codex/honhyeol-massage"),
    mode: "content-runtime",
  },
];

const TARGET_CUSTOMER_FILES = [
  "src/app/page.tsx",
  "src/app/areas/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/guide/page.tsx",
  "src/app/notice/page.tsx",
  "src/app/blog/page.tsx",
  "src/app/blog/[slug]/page.tsx",
  "src/components/RegionExperience.tsx",
  "src/components/RegionGallery.tsx",
  "src/components/RegionSearch.tsx",
  "src/components/SiteFooter.tsx",
  "src/components/SiteHeader.tsx",
  "src/data/blog-posts.ts",
  "src/lib/content.ts",
  "src/lib/region-page-model.ts",
  "src/lib/site-content.ts",
];

const BRAND_PATTERN =
  /마사지데이|마사지봄|마사지러브|콜미토닥이|랑테라피|필링홈타이|건마에반하다|혼혈마사지|GEONMAE BANHADA|HONHYEOL/giu;
const SUBSTANTIVE_HANGUL_MINIMUM = 12;

for (const repository of AUTHORITATIVE_REPOSITORIES) {
  if (!path.isAbsolute(repository.root) || !existsSync(repository.root)) {
    throw new Error(
      "MASSAGE_DAY_COPY_AUDIT_AUTHORITATIVE_REPOSITORY_MISSING:" +
        repository.root,
    );
  }
}
if (!existsSync(TSX_BIN)) {
  throw new Error("MASSAGE_DAY_COPY_AUDIT_TSX_MISSING:" + TSX_BIN);
}

function escapeRegExp(value) {
  return value.replace(/[-/\^$*+?.()|[\]{}]/gu, "\\$&");
}

const ALL_REGION_LABELS = [
  ...new Set(
    ACTIVE_REGION_NODES.flatMap((node) => [
      node.qualifiedName,
      node.displayName,
      getKeywordRegionLabel(node),
      ...(node.representative?.sourceNames ?? []),
    ]).filter((value) => value.length >= 2),
  ),
].sort((left, right) => right.length - left.length);
const ALL_REGION_PATTERN = new RegExp(
  ALL_REGION_LABELS.map(escapeRegExp).join("|"),
  "gu",
);

function clean(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function isSubstantive(value) {
  return (value.match(/[가-힣]/gu) ?? []).length >= SUBSTANTIVE_HANGUL_MINIMUM;
}

function normalizeSource(value) {
  return clean(value)
    .replace(BRAND_PATTERN, "{브랜드}")
    .replace(ALL_REGION_PATTERN, "{지역}");
}

function normalizeRegional(value, node) {
  const labels = [
    node.qualifiedName,
    node.displayName,
    getKeywordRegionLabel(node),
  ]
    .filter(
      (label, index, all) =>
        label.length > 0 && all.indexOf(label) === index,
    )
    .sort((left, right) => right.length - left.length);
  return labels
    .reduce((copy, label) => copy.replaceAll(label, "{지역}"), clean(value))
    .replace(BRAND_PATTERN, "{브랜드}");
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function addValue(map, value, normalizer = clean) {
  const normalized = normalizer(value);
  if (!isSubstantive(normalized)) return;
  map.set(hash(normalized), normalized);
}

function collectStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

function extractTypeScriptStrings(file) {
  const source = readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const values = [];
  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      values.push(node.text);
    } else if (ts.isTemplateExpression(node)) {
      values.push(
        node.head.text +
          node.templateSpans
            .map((span) => "{값}" + span.literal.text)
            .join(""),
      );
    } else if (ts.isJsxText(node)) {
      values.push(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return values;
}

function extractFileStrings(file) {
  if (file.endsWith(".json")) {
    return collectStrings(JSON.parse(readFileSync(file, "utf8")));
  }
  return extractTypeScriptStrings(file);
}

function listCustomerSourceFiles(root) {
  const sourceRoot = path.join(root, "src");
  if (!existsSync(sourceRoot)) {
    throw new Error("MASSAGE_DAY_COPY_AUDIT_SOURCE_ROOT_MISSING:" + sourceRoot);
  }
  const files = [];
  const queue = [sourceRoot];
  while (queue.length > 0) {
    const current = queue.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(resolved);
      } else if (/\.(?:ts|tsx|json)$/u.test(entry.name)) {
        files.push(resolved);
      }
    }
  }
  return files.sort();
}

function targetSourceValues() {
  const values = [];
  for (const relative of TARGET_CUSTOMER_FILES) {
    const file = path.join(ROOT, relative);
    if (!existsSync(file)) {
      throw new Error("MASSAGE_DAY_COPY_AUDIT_TARGET_FILE_MISSING:" + file);
    }
    values.push(...extractFileStrings(file));
  }
  return values;
}

function regionalContentValues(content) {
  return [
    content.title,
    content.description,
    content.h1,
    ...content.hooks,
    ...content.sections.flatMap((item) => [
      item.heading,
      ...item.paragraphs,
    ]),
  ];
}

function genericRuntimeCode() {
  return [
    'import { createHash } from "node:crypto";',
    'import { createRegionContent } from "./src/lib/content.ts";',
    'import { ACTIVE_REGION_NODES, getKeywordRegionLabel } from "./src/lib/regions.ts";',
    'const brands = /마사지데이|마사지봄|마사지러브|콜미토닥이|랑테라피|필링홈타이|건마에반하다|혼혈마사지|GEONMAE BANHADA|HONHYEOL/giu;',
    'const digest = (value) => createHash("sha256").update(value).digest("hex");',
    'const clean = (value) => value.replace(/\\s+/gu, " ").trim();',
    'const substantive = (value) => (value.match(/[가-힣]/gu) ?? []).length >= 12;',
    'function normalize(value, node) {',
    '  const labels = [node.qualifiedName, node.displayName, getKeywordRegionLabel(node)]',
    '    .filter((label, index, all) => label && all.indexOf(label) === index)',
    '    .sort((left, right) => right.length - left.length);',
    '  return labels.reduce((copy, label) => copy.replaceAll(label, "{지역}"), clean(value)).replace(brands, "{브랜드}");',
    '}',
    'const exact = new Set();',
    'const normalized = new Set();',
    'for (const node of ACTIVE_REGION_NODES) {',
    '  const content = createRegionContent(node);',
    '  const values = [content.title, content.description, content.h1, ...content.hooks,',
    '    ...content.sections.flatMap((item) => [item.heading, ...item.paragraphs])];',
    '  for (const value of values) {',
    '    const cleaned = clean(value);',
    '    if (substantive(cleaned)) exact.add(digest(cleaned));',
    '    const regional = normalize(value, node);',
    '    if (substantive(regional)) normalized.add(digest(regional));',
    '  }',
    '}',
    'process.stdout.write(JSON.stringify({ routeCount: ACTIVE_REGION_NODES.length, exact: [...exact], normalized: [...normalized] }));',
  ].join("\n");
}

function massageBomRuntimeCode() {
  return [
    'import { createHash } from "node:crypto";',
    'import { buildRegionCustomerCopy } from "./src/lib/region-customer-copy.ts";',
    'import { buildRegionEditorialCopy } from "./src/lib/region-editorial-copy.ts";',
    'import { buildRegionSeoCopy } from "./src/lib/region-seo-copy.ts";',
    'import { getAllRegionStaticParams, getRegionBreadcrumbs, resolveRegionNode } from "./src/lib/regions.ts";',
    'const brands = /마사지데이|마사지봄|마사지러브|콜미토닥이|랑테라피|필링홈타이|건마에반하다|혼혈마사지|GEONMAE BANHADA|HONHYEOL/giu;',
    'const digest = (value) => createHash("sha256").update(value).digest("hex");',
    'const clean = (value) => value.replace(/\\s+/gu, " ").trim();',
    'const substantive = (value) => (value.match(/[가-힣]/gu) ?? []).length >= 12;',
    'function strings(value, output = []) {',
    '  if (typeof value === "string") output.push(value);',
    '  else if (Array.isArray(value)) for (const item of value) strings(item, output);',
    '  else if (value && typeof value === "object") for (const item of Object.values(value)) strings(item, output);',
    '  return output;',
    '}',
    'const exact = new Set();',
    'const normalized = new Set();',
    'let routeCount = 0;',
    'for (const params of getAllRegionStaticParams()) {',
    '  const node = resolveRegionNode(params.segments);',
    '  if (!node) continue;',
    '  routeCount += 1;',
    '  const objects = [];',
    '  try { objects.push(buildRegionCustomerCopy(node, node.displayName)); } catch {}',
    '  try { objects.push(buildRegionEditorialCopy(node, node.displayName)); } catch {}',
    '  try { objects.push(buildRegionSeoCopy(node)); } catch {}',
    '  const labels = [...new Set([node.displayName, ...getRegionBreadcrumbs(node).slice(1).map((item) => item.name)])]',
    '    .sort((left, right) => right.length - left.length);',
    '  for (const value of strings(objects)) {',
    '    const cleaned = clean(value);',
    '    if (substantive(cleaned)) exact.add(digest(cleaned));',
    '    const regional = labels.reduce((copy, label) => copy.replaceAll(label, "{지역}"), cleaned).replace(brands, "{브랜드}");',
    '    if (substantive(regional)) normalized.add(digest(regional));',
    '  }',
    '}',
    'process.stdout.write(JSON.stringify({ routeCount, exact: [...exact], normalized: [...normalized] }));',
  ].join("\n");
}

function runRuntime(repository) {
  const code =
    repository.mode === "massagebom-runtime"
      ? massageBomRuntimeCode()
      : genericRuntimeCode();
  const raw = execFileSync(TSX_BIN, ["-e", code], {
    cwd: repository.root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const parsed = JSON.parse(raw);
  if (
    !Number.isInteger(parsed.routeCount) ||
    parsed.routeCount <= 0 ||
    !Array.isArray(parsed.exact) ||
    !Array.isArray(parsed.normalized)
  ) {
    throw new Error(
      "MASSAGE_DAY_COPY_AUDIT_RUNTIME_RESULT_INVALID:" + repository.root,
    );
  }
  return {
    routeCount: parsed.routeCount,
    exact: new Set(parsed.exact),
    normalized: new Set(parsed.normalized),
  };
}

function snapshotRuntime(repository) {
  const file = path.join(repository.root, repository.snapshot);
  if (!existsSync(file)) {
    throw new Error("MASSAGE_DAY_COPY_AUDIT_SNAPSHOT_MISSING:" + file);
  }
  const snapshot = JSON.parse(readFileSync(file, "utf8"));
  const records = snapshot.entries ?? snapshot.documents;
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("MASSAGE_DAY_COPY_AUDIT_SNAPSHOT_INVALID:" + file);
  }
  const nodeByRoute = new Map(
    ACTIVE_REGION_NODES.map((node) => [node.path, node]),
  );
  const exact = new Set();
  const normalized = new Set();
  for (const record of records) {
    const values = collectStrings(record);
    const node = nodeByRoute.get(record.route);
    const labels = [
      node?.qualifiedName,
      node?.displayName,
      record.regionName,
      record.commercialName,
      record.localityLabel,
      ...(record.regionAliases ?? []),
      ...(record.keywordPrefixes ?? []),
    ]
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);
    for (const value of values) {
      const cleaned = clean(value);
      if (isSubstantive(cleaned)) exact.add(hash(cleaned));
      const regional = labels
        .reduce(
          (copy, label) => copy.replaceAll(label, "{지역}"),
          cleaned,
        )
        .replace(BRAND_PATTERN, "{브랜드}");
      if (isSubstantive(regional)) normalized.add(hash(regional));
    }
  }
  return {
    routeCount: records.length,
    exact,
    normalized,
  };
}

function comparatorCorpus(repository) {
  const sourceExact = new Set();
  const sourceNormalized = new Set();
  const sourceFiles = listCustomerSourceFiles(repository.root);
  for (const file of sourceFiles) {
    for (const value of extractFileStrings(file)) {
      const cleaned = clean(value);
      if (isSubstantive(cleaned)) sourceExact.add(hash(cleaned));
      const normalized = normalizeSource(value);
      if (isSubstantive(normalized)) {
        sourceNormalized.add(hash(normalized));
      }
    }
  }
  const runtime =
    repository.mode === "snapshot"
      ? snapshotRuntime(repository)
      : runRuntime(repository);
  return {
    sourceFileCount: sourceFiles.length,
    runtimeRouteCount: runtime.routeCount,
    exact: new Set([...sourceExact, ...runtime.exact]),
    normalized: new Set([...sourceNormalized, ...runtime.normalized]),
  };
}

function maxFrequency(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Math.max(...counts.values());
}

const records = ACTIVE_REGION_NODES.map((node) => ({
  node,
  content: createRegionContent(node),
}));
const broadRecords = records.filter(({ node }) => isBroadDetailRegion(node));
const compactRecords = records.filter(({ node }) => !isBroadDetailRegion(node));

const targetExact = new Map();
const targetNormalized = new Map();
for (const value of targetSourceValues()) {
  addValue(targetExact, value);
  addValue(targetNormalized, value, normalizeSource);
}
for (const { node, content } of records) {
  for (const value of regionalContentValues(content)) {
    addValue(targetExact, value);
    addValue(targetNormalized, value, (entry) =>
      normalizeRegional(entry, node),
    );
  }
}

const fullSignatures = records.map(({ node, content }) =>
  normalizeRegional(
    [
      content.description,
      ...content.hooks,
      ...content.sections.flatMap((item) => item.paragraphs),
    ].join("\u001f"),
    node,
  ),
);
const compactSlotMaxima = [];
for (
  let sectionIndex = 0;
  sectionIndex < COMPACT_DETAIL_SECTION_IDS.length;
  sectionIndex += 1
) {
  for (let paragraphIndex = 0; paragraphIndex < 2; paragraphIndex += 1) {
    compactSlotMaxima.push(
      maxFrequency(
        compactRecords.map(({ node, content }) =>
          normalizeRegional(
            content.sections[sectionIndex].paragraphs[paragraphIndex],
            node,
          ),
        ),
      ),
    );
  }
}
const broadSlotMaxima = [];
for (
  let sectionIndex = 0;
  sectionIndex < BROAD_DETAIL_SECTION_IDS.length;
  sectionIndex += 1
) {
  for (let paragraphIndex = 0; paragraphIndex < 2; paragraphIndex += 1) {
    broadSlotMaxima.push(
      maxFrequency(
        broadRecords.map(({ node, content }) =>
          normalizeRegional(
            content.sections[sectionIndex].paragraphs[paragraphIndex],
            node,
          ),
        ),
      ),
    );
  }
}

const normalizedTitles = records.map(({ node, content }) =>
  normalizeRegional(content.title, node),
);
const normalizedDescriptions = records.map(({ node, content }) =>
  normalizeRegional(content.description, node),
);
const normalizedH1s = records.map(({ node, content }) =>
  normalizeRegional(content.h1, node),
);

const comparisons = {};
for (const repository of AUTHORITATIVE_REPOSITORIES) {
  const corpus = comparatorCorpus(repository);
  const exactCollisions = [...targetExact]
    .filter(([digest]) => corpus.exact.has(digest))
    .map(([, value]) => value)
    .sort();
  const normalizedCollisions = [...targetNormalized]
    .filter(([digest]) => corpus.normalized.has(digest))
    .map(([, value]) => value)
    .sort();
  comparisons[repository.id] = {
    absolutePath: repository.root,
    sourceFileCount: corpus.sourceFileCount,
    runtimeRouteCount: corpus.runtimeRouteCount,
    substantiveExactCollisions: {
      count: exactCollisions.length,
      examples: exactCollisions.slice(0, 8),
    },
    brandRegionNormalizedCollisions: {
      count: normalizedCollisions.length,
      examples: normalizedCollisions.slice(0, 8),
    },
  };
}

const paragraphs = records.flatMap(({ content }) =>
  content.sections.flatMap((item) => item.paragraphs),
);
const report = {
  status: "PASS",
  authoritativeRepositoryCount: AUTHORITATIVE_REPOSITORIES.length,
  authoritativeRepositories: AUTHORITATIVE_REPOSITORIES.map(
    (item) => item.root,
  ),
  substantiveHangulMinimum: SUBSTANTIVE_HANGUL_MINIMUM,
  routeCount: records.length,
  broadDetailRoutes: broadRecords.length,
  compactRoutes: compactRecords.length,
  broadSectionCount: BROAD_DETAIL_SECTION_IDS.length,
  compactSectionCount: COMPACT_DETAIL_SECTION_IDS.length,
  uniqueTitles: new Set(records.map(({ content }) => content.title)).size,
  uniqueDescriptions: new Set(
    records.map(({ content }) => content.description),
  ).size,
  uniqueH1s: new Set(records.map(({ content }) => content.h1)).size,
  uniqueParagraphs: new Set(paragraphs).size,
  paragraphCount: paragraphs.length,
  normalizedTitleForms: new Set(normalizedTitles).size,
  normalizedTitleMaxReuse: maxFrequency(normalizedTitles),
  normalizedDescriptionForms: new Set(normalizedDescriptions).size,
  normalizedDescriptionMaxReuse: maxFrequency(normalizedDescriptions),
  normalizedH1Forms: new Set(normalizedH1s).size,
  normalizedH1MaxReuse: maxFrequency(normalizedH1s),
  uniqueNormalizedFullSignatures: new Set(fullSignatures).size,
  broadNormalizedSlotMaxReuse: Math.max(...broadSlotMaxima),
  compactNormalizedSlotMaxReuse: Math.max(...compactSlotMaxima),
  broadRouteSetSha256: hash(
    broadRecords.map(({ node }) => node.path).sort().join("\n"),
  ),
  comparisons,
};

const shapePass =
  report.authoritativeRepositoryCount === 7 &&
  report.routeCount === 1291 &&
  report.broadDetailRoutes === 41 &&
  report.compactRoutes === 1250 &&
  report.broadSectionCount === 11 &&
  report.compactSectionCount === 10 &&
  report.uniqueTitles === 1291 &&
  report.uniqueDescriptions === 1291 &&
  report.uniqueH1s === 1291 &&
  report.uniqueParagraphs === report.paragraphCount &&
  report.uniqueNormalizedFullSignatures === 1291 &&
  report.normalizedTitleForms >= 11 &&
  report.normalizedDescriptionForms >= 900 &&
  report.normalizedDescriptionMaxReuse <= 7 &&
  report.normalizedH1Forms >= 11 &&
  report.broadNormalizedSlotMaxReuse <= 5 &&
  report.compactNormalizedSlotMaxReuse <= 5 &&
  report.broadRouteSetSha256 ===
    "bc78efbc93abacd5dca4aea0e06897343d9858ea8d5efb85c1fd9733fe436771";
const collisionPass = Object.values(comparisons).every(
  (comparison) =>
    comparison.substantiveExactCollisions.count === 0 &&
    comparison.brandRegionNormalizedCollisions.count === 0,
);
if (!shapePass || !collisionPass) report.status = "FAIL";

console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
