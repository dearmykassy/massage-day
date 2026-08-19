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
import { PHONE_DISPLAY } from "../src/lib/business.ts";
import {
  BROAD_DETAIL_SECTION_IDS,
  COMPACT_DETAIL_SECTION_IDS,
  createRegionContent,
  isBroadDetailRegion,
} from "../src/lib/content.ts";
import {
  ACTIVE_REGION_NODES,
  getDirectChildren,
  getParentNode,
  getRegionHeadingLabel,
  getKeywordRegionLabel,
  getPrimaryRegionKeyword,
  getSearchRegionLabel,
  shortenRegionSearchName,
} from "../src/lib/regions.ts";
import { createRegionPageModel } from "../src/lib/region-page-model.ts";

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

const BRAND_LABELS = [
  "마사지데이",
  "마사지봄",
  "마사지러브",
  "콜미토닥이",
  "랑테라피",
  "필링홈타이",
  "건마에반하다",
  "혼혈마사지",
  "GEONMAE BANHADA",
  "HONHYEOL",
];
const SUBSTANTIVE_HANGUL_MINIMUM = 12;
const EXACT_REPEATED_BLOCK_SHARE_LIMIT = 0.25;
const NORMALIZED_REPEATED_BLOCK_SHARE_LIMIT = 0.35;
const MINIMUM_BLOCK_VISIBLE_CHARACTERS = 1;
const MINIMUM_REGIONAL_FACT_BLOCK_VISIBLE_CHARACTERS = 24;
const MINIMUM_REGIONAL_FACT_BLOCKS_PER_PAGE = 3;
const MINIMUM_PAGE_SPECIFIC_CHARACTER_SHARE = 0.25;
const WORST_EXAMPLE_LIMIT = 8;
const RENDERED_BANNED_VISIBLE_PATTERNS = [
  {
    id: "route-depth-decorative-copy",
    source: "SERVICE AREA + route-depth number",
    pattern: /SERVICE\s+AREA\s*·\s*\d+/giu,
  },
  {
    id: "technical-or-address-audit-wording",
    source:
      "정본|원본 자료|자료 분류|행정 단계 수|대표 분류|관할 방식|원본 행정|profile|seed|hash|ordinal|slot|signature|trigram|Jaccard|filler",
    pattern:
      /정본|원본\s*자료|자료\s*분류|행정\s*단계\s*수|대표\s*분류|관할\s*방식|원본\s*행정|profile|seed|hash|ordinal|slot|signature|trigram|jaccard|filler/giu,
  },
  {
    id: "korean-list-order-wording",
    source:
      "목록/리스트/나열/표시/정렬/배열 + 순서·순번·앞뒤, 순서상, 순번, 앞·뒤·이전·다음 항목, N번째/N번/첫째~넷째 목록·항목·문장·지역·경로·페이지·칸·자리",
    pattern:
      /(?:목록|리스트|나열|표시|정렬|배열)(?:의|에서|상)?\s*(?:순서|순번|앞(?:쪽|부분)?|뒤(?:쪽|부분)?|(?:(?:첫|두|세|네|마지막|[0-9]+)\s*(?:번째|번)|첫째|둘째|셋째|넷째))|순서상|순번|(?:앞|뒤|이전|다음)\s*(?:항목|순서|순번)|(?:(?:첫|두|세|네|마지막|[0-9]+)\s*(?:번째|번)|첫째|둘째|셋째|넷째)\s*(?:목록|항목|문장|지역|경로|페이지|칸|자리)/gu,
  },
];
const CONTENT_SOURCE_SELECTION_PATTERNS = [
  { id: "getRegionOrdinal", pattern: /\bgetRegionOrdinal\b/u },
  { id: "profile", pattern: /profile/iu },
  { id: "seed", pattern: /seed/iu },
];
const ALLOWED_COMMON_ACTION_SIGNATURES = [
  "전화로 예약 항목 문의",
  "5개 코스·가격 보기",
  "5개 코스·14개 금액 전체 보기",
  "마사지데이 이용 순서 전체 보기",
  "상위·관련 지역 보기",
  "전화상담",
].sort();
const ALLOWED_COMMON_TARGET_NORMALIZED_HEADING_SIGNATURES = [
  "서비스 안내",
  "서비스 지역 범위",
  "지역 서비스 범위",
  "전화 예약 문의 전 준비",
  "24시간 전화상담",
  "일정과 24시간 전화상담",
  "코스·가격 확인",
  "2인 프로그램 문의",
  "2인 프로그램 확인",
  "이용 뒤 현장 후불",
  "선입금 없는 현장 후불",
  "비품·소독 운영 기준",
  "일회용 비품·소독 기준",
  "전화 문의부터 이용까지",
  "전화 문의와 이용 흐름",
  "변경 항목 전화 확인",
  "하위·관련 지역 안내",
  "상위·관련 지역 안내",
].sort();
const ALLOWED_COMMON_VERIFIED_OPERATING_SIGNATURES = [
  "365일 24시간 전화상담",
  PHONE_DISPLAY,
].sort();

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

const BRAND_PATTERN = new RegExp(
  BRAND_LABELS.map(escapeRegExp).join("|"),
  "giu",
);

const ALL_REGION_LABELS = [
  ...new Set(
    ACTIVE_REGION_NODES.flatMap((node) => [
      node.qualifiedName,
      node.displayName,
      getRegionHeadingLabel(node),
      getSearchRegionLabel(node),
      getKeywordRegionLabel(node),
      getPrimaryRegionKeyword(node),
      shortenRegionSearchName(node.qualifiedName),
      ...(node.representative?.sourceNames ?? []),
    ]).filter((value) => value.length >= 2),
  ),
].sort((left, right) => right.length - left.length);
const ALL_REGION_PATTERN = new RegExp(
  ALL_REGION_LABELS.map(escapeRegExp).join("|"),
  "gu",
);

function uniqueSortedLabels(values) {
  return [...new Set(values.filter(Boolean))].sort(
    (left, right) => right.length - left.length || left.localeCompare(right),
  );
}

const STRONG_REGION_LABEL_CATEGORIES = {
  qualifiedNames: uniqueSortedLabels(
    ACTIVE_REGION_NODES.map((node) => node.qualifiedName),
  ),
  displayNames: uniqueSortedLabels(
    ACTIVE_REGION_NODES.map((node) => node.displayName),
  ),
  headingLabels: uniqueSortedLabels(
    ACTIVE_REGION_NODES.map((node) => getRegionHeadingLabel(node)),
  ),
  searchLabels: uniqueSortedLabels(
    ACTIVE_REGION_NODES.map((node) => getSearchRegionLabel(node)),
  ),
  keywordLabels: uniqueSortedLabels(
    ACTIVE_REGION_NODES.map((node) => getKeywordRegionLabel(node)),
  ),
  shortenedQualifiedNames: uniqueSortedLabels(
    ACTIVE_REGION_NODES.map((node) =>
      shortenRegionSearchName(node.qualifiedName),
    ),
  ),
  aliases: uniqueSortedLabels(
    ACTIVE_REGION_NODES.flatMap(
      (node) => node.representative?.sourceNames ?? [],
    ),
  ),
  legalAreaNames: uniqueSortedLabels(
    ACTIVE_REGION_NODES.flatMap((node) =>
      (node.representative?.legalAreas ?? []).map((area) => area.name),
    ),
  ),
};
const STRONG_REGION_LABELS = uniqueSortedLabels(
  Object.values(STRONG_REGION_LABEL_CATEGORIES).flat(),
);
const STRONG_REGION_PATTERN = new RegExp(
  STRONG_REGION_LABELS.map(escapeRegExp).join("|"),
  "gu",
);
const DYNAMIC_JOSA_LABELS = uniqueSortedLabels([
  ...STRONG_REGION_LABELS,
  ...BRAND_LABELS.filter((label) => /^[가-힣]+$/u.test(label)),
]);
const DYNAMIC_RO_EULO_PATTERN = new RegExp(
  `(${DYNAMIC_JOSA_LABELS.map(escapeRegExp).join("|")})(으로|로)(?=[^가-힣]|$)`,
  "gu",
);
const NUMBER_PATTERN = /\p{Number}+(?:[.,:/-]\p{Number}+)*/gu;

const nodeByPath = new Map(
  ACTIVE_REGION_NODES.map((node) => [node.path, node]),
);
const relationshipPathSets = {
  current: new Set(ACTIVE_REGION_NODES.map((node) => node.path)),
  parent: new Set(),
  sibling: new Set(),
  child: new Set(),
};
const relationshipOccurrenceCounts = {
  current: ACTIVE_REGION_NODES.length,
  parent: 0,
  sibling: 0,
  child: 0,
  alias: 0,
};
for (const node of ACTIVE_REGION_NODES) {
  const parent = getParentNode(node);
  if (parent) {
    relationshipOccurrenceCounts.parent += 1;
    relationshipPathSets.parent.add(parent.path);
    for (const sibling of getDirectChildren(parent)) {
      if (sibling.path !== node.path && nodeByPath.has(sibling.path)) {
        relationshipOccurrenceCounts.sibling += 1;
        relationshipPathSets.sibling.add(sibling.path);
      }
    }
  }
  for (const child of getDirectChildren(node)) {
    if (nodeByPath.has(child.path)) {
      relationshipOccurrenceCounts.child += 1;
      relationshipPathSets.child.add(child.path);
    }
  }
  relationshipOccurrenceCounts.alias +=
    (node.representative?.sourceNames ?? []).length;
}

function clean(value) {
  return value.replace(/\s+/gu, " ").trim();
}

function strongNormalize(value) {
  return clean(
    value
      .normalize("NFKC")
      .replace(BRAND_PATTERN, " ")
      .replace(STRONG_REGION_PATTERN, " ")
      .replace(NUMBER_PATTERN, " ")
      .toLowerCase(),
  );
}

const TARGET_REGION_LABELS_BY_PATH = new Map(
  ACTIVE_REGION_NODES.map((node) => [
    node.path,
    uniqueSortedLabels([
      node.qualifiedName,
      node.displayName,
      getRegionHeadingLabel(node),
      getSearchRegionLabel(node),
      getKeywordRegionLabel(node),
      getPrimaryRegionKeyword(node),
      shortenRegionSearchName(node.qualifiedName),
    ]),
  ]),
);

function relatedPreservedLabels(node) {
  const parent = getParentNode(node);
  const relatedNodes = [
    ...(parent ? [parent] : []),
    ...getDirectChildren(node)
      .map((child) => nodeByPath.get(child.path))
      .filter(Boolean),
    ...(parent
      ? getDirectChildren(parent)
          .filter((sibling) => sibling.path !== node.path)
          .map((sibling) => nodeByPath.get(sibling.path))
          .filter(Boolean)
      : []),
  ];
  return uniqueSortedLabels([
    ...relatedNodes.flatMap((related) => [
      related.qualifiedName,
      related.displayName,
      getRegionHeadingLabel(related),
      getSearchRegionLabel(related),
      getKeywordRegionLabel(related),
      shortenRegionSearchName(related.qualifiedName),
      ...(related.representative?.sourceNames ?? []),
      ...(related.representative?.legalAreas ?? []).map((area) => area.name),
    ]),
    ...(node.representative?.sourceNames ?? []),
    ...(node.representative?.legalAreas ?? []).map((area) => area.name),
  ]);
}

const TARGET_PRESERVED_LABELS_BY_PATH = new Map(
  ACTIVE_REGION_NODES.map((node) => [
    node.path,
    relatedPreservedLabels(node).filter(
      (label) => !TARGET_REGION_LABELS_BY_PATH.get(node.path).includes(label),
    ),
  ]),
);
const TARGET_NORMALIZATION_CONFIG_BY_PATH = new Map(
  ACTIVE_REGION_NODES.map((node) => {
    const targetLabels = TARGET_REGION_LABELS_BY_PATH.get(node.path);
    const preservedLabels = TARGET_PRESERVED_LABELS_BY_PATH.get(node.path);
    if (preservedLabels.length > 0x1900) {
      throw new Error(
        `MASSAGE_DAY_COPY_AUDIT_TARGET_PRESERVED_LABEL_LIMIT:${node.path}:${preservedLabels.length}`,
      );
    }
    const targetSet = new Set(targetLabels);
    const preservedReplacementByLabel = new Map(
      preservedLabels.map((label, index) => [
        label,
        String.fromCodePoint(0xe000 + index),
      ]),
    );
    const preservedLabelByReplacement = new Map(
      [...preservedReplacementByLabel].map(([label, replacement]) => [
        replacement,
        label,
      ]),
    );
    const combinedLabels = uniqueSortedLabels([
      ...targetLabels,
      ...preservedLabels,
    ]);
    return [
      node.path,
      {
        pattern: new RegExp(combinedLabels.map(escapeRegExp).join("|"), "gu"),
        targetSet,
        preservedReplacementByLabel,
        preservedLabelByReplacement,
      },
    ];
  }),
);

function targetNormalize(value, node) {
  const config = TARGET_NORMALIZATION_CONFIG_BY_PATH.get(node.path);
  if (!config) {
    throw new Error(
      `MASSAGE_DAY_COPY_AUDIT_TARGET_NORMALIZATION_PATTERN_MISSING:${node.path}`,
    );
  }
  let normalized = value
    .normalize("NFKC")
    .replace(BRAND_PATTERN, " ")
    .replace(config.pattern, (matched) => {
      if (config.targetSet.has(matched)) return " ";
      const replacement = config.preservedReplacementByLabel.get(matched);
      if (!replacement) {
        throw new Error(
          `MASSAGE_DAY_COPY_AUDIT_TARGET_PRESERVE_REPLACEMENT_MISSING:${node.path}:${matched}`,
        );
      }
      return replacement;
    })
    .toLowerCase();
  for (const [replacement, label] of config.preservedLabelByReplacement) {
    normalized = normalized.replaceAll(replacement, label);
  }
  return clean(normalized);
}

function visibleWordTokens(value) {
  return strongNormalize(value).match(/[가-힣]+|[a-z]+/gu) ?? [];
}

function wordTrigramSet(tokens) {
  const trigrams = new Set();
  for (let index = 0; index + 2 < tokens.length; index += 1) {
    trigrams.add(
      [tokens[index], tokens[index + 1], tokens[index + 2]].join("\u001f"),
    );
  }
  return trigrams;
}

function visibleCharacterCount(value) {
  return (value.match(/[가-힣A-Za-z0-9]/gu) ?? []).length;
}

function roundMetric(value) {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}

function percentile(sortedValues, fraction) {
  if (sortedValues.length === 0) return 0;
  const index = Math.max(
    0,
    Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * fraction) - 1),
  );
  return sortedValues[index];
}

function renderedPrimaryBlocks(model) {
  const byId = new Map(model.renderedSurface.map((entry) => [entry.id, entry]));
  const orderedIds = [
    "opening:h1",
    ...model.opening.hookCopyIds,
    ...model.movements.flatMap((movement) => [
      movement.headingCopyId,
      ...movement.paragraphCopyIds,
      ...(movement.action ? [movement.action.copyId] : []),
    ]),
    model.gallery.guide.headingCopyId,
    ...model.gallery.guide.paragraphCopyIds,
    model.gallery.guide.actionCopyId,
  ];
  return orderedIds.map((id) => {
    const block = byId.get(id);
    if (!block) {
      throw new Error(
        `MASSAGE_DAY_COPY_AUDIT_RENDERED_PRIMARY_BLOCK_MISSING:${model.route}:${id}`,
      );
    }
    return block;
  });
}

function renderedSemanticSectionBlocks(model) {
  const byId = new Map(model.renderedSurface.map((entry) => [entry.id, entry]));
  const sectionDefinitions = [
    ...model.movements.map((movement) => ({
      id: `semantic-section:${movement.section.id}`,
      copyIds: [
        movement.headingCopyId,
        ...movement.paragraphCopyIds,
        ...(movement.action ? [movement.action.copyId] : []),
      ],
    })),
    {
      id: `semantic-section:${model.gallery.guide.section.id}`,
      copyIds: [
        model.gallery.guide.headingCopyId,
        ...model.gallery.guide.paragraphCopyIds,
        model.gallery.guide.actionCopyId,
      ],
    },
  ];
  return sectionDefinitions.map((section) => ({
    id: section.id,
    classification: "candidate-customer-guidance",
    value: section.copyIds
      .map((copyId) => {
        const block = byId.get(copyId);
        if (!block) {
          throw new Error(
            `MASSAGE_DAY_COPY_AUDIT_SEMANTIC_SECTION_BLOCK_MISSING:${model.route}:${copyId}`,
          );
        }
        return block.value;
      })
      .join("\n"),
  }));
}

function jaccard(left, right) {
  const smaller = left.size <= right.size ? left : right;
  const larger = smaller === left ? right : left;
  let intersection = 0;
  for (const value of smaller) {
    if (larger.has(value)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return {
    intersection,
    union,
    score: union === 0 ? 1 : intersection / union,
  };
}

function addWorstPair(worstPairs, candidate) {
  if (
    worstPairs.length < WORST_EXAMPLE_LIMIT ||
    candidate.score > worstPairs.at(-1).score
  ) {
    worstPairs.push(candidate);
    worstPairs.sort(
      (left, right) =>
        right.score - left.score ||
        left.leftRoute.localeCompare(right.leftRoute) ||
        left.rightRoute.localeCompare(right.rightRoute),
    );
    if (worstPairs.length > WORST_EXAMPLE_LIMIT) worstPairs.pop();
  }
}

function auditInternalNearDuplicates(documents) {
  const expectedPairCount = (documents.length * (documents.length - 1)) / 2;
  const scores = new Float64Array(expectedPairCount);
  const worstPairs = [];
  let pairIndex = 0;
  for (let leftIndex = 0; leftIndex < documents.length; leftIndex += 1) {
    const left = documents[leftIndex];
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < documents.length;
      rightIndex += 1
    ) {
      const right = documents[rightIndex];
      const result = jaccard(left.trigrams, right.trigrams);
      scores[pairIndex] = result.score;
      pairIndex += 1;
      addWorstPair(worstPairs, {
        leftRoute: left.route,
        rightRoute: right.route,
        score: result.score,
        sharedTrigrams: result.intersection,
        unionTrigrams: result.union,
        leftTrigramCount: left.trigrams.size,
        rightTrigramCount: right.trigrams.size,
        leftNormalizedPreview: left.normalizedText.slice(0, 320),
        rightNormalizedPreview: right.normalizedText.slice(0, 320),
      });
    }
  }
  if (pairIndex !== expectedPairCount) {
    throw new Error(
      `MASSAGE_DAY_COPY_AUDIT_NEAR_DUPLICATE_PAIR_COUNT_INVALID:${pairIndex}:${expectedPairCount}`,
    );
  }
  scores.sort();
  const p95 = percentile(scores, 0.95);
  const maximum = scores.at(-1) ?? 0;
  return {
    documentCount: documents.length,
    pairing: "exhaustive unordered document pairs; no sampling",
    allPairsEvaluated: pairIndex === expectedPairCount,
    evaluatedPairCount: pairIndex,
    samplePairCount: pairIndex,
    expectedPairCount,
    tokenCount: documents.reduce(
      (total, document) => total + document.tokens.length,
      0,
    ),
    minimumTokensPerDocument: Math.min(
      ...documents.map((document) => document.tokens.length),
    ),
    maximumTokensPerDocument: Math.max(
      ...documents.map((document) => document.tokens.length),
    ),
    uniqueTrigramCount: new Set(
      documents.flatMap((document) => [...document.trigrams]),
    ).size,
    minimumTrigramsPerDocument: Math.min(
      ...documents.map((document) => document.trigrams.size),
    ),
    maximumTrigramsPerDocument: Math.max(
      ...documents.map((document) => document.trigrams.size),
    ),
    enforcement: "diagnostic-only; no Jaccard threshold changes release status",
    p95: roundMetric(p95),
    maximum: roundMetric(maximum),
    worstExamples: worstPairs.map((pair) => ({
      ...pair,
      score: roundMetric(pair.score),
    })),
  };
}

function auditStrongNormalizedFullDocumentCollisions(documents) {
  const groupsByDocument = new Map();
  for (const document of documents) {
    const group = groupsByDocument.get(document.normalizedText) ?? [];
    group.push(document.route);
    groupsByDocument.set(document.normalizedText, group);
  }
  const collisionGroups = [...groupsByDocument]
    .filter(([, routes]) => routes.length > 1)
    .map(([normalizedDocument, routes]) => ({
      normalizedDocument,
      routes: [...routes].sort(),
      pairCount: (routes.length * (routes.length - 1)) / 2,
    }))
    .sort(
      (left, right) =>
        right.pairCount - left.pairCount ||
        left.routes[0].localeCompare(right.routes[0]),
    );
  const collisionPairCount = collisionGroups.reduce(
    (total, group) => total + group.pairCount,
    0,
  );
  return {
    enforcement:
      "diagnostic-only: strong all-related-label normalized full-document collisions do not change release status",
    documentCount: documents.length,
    uniqueNormalizedDocumentCount: groupsByDocument.size,
    collisionGroupCount: collisionGroups.length,
    collisionDocumentCount: new Set(
      collisionGroups.flatMap((group) => group.routes),
    ).size,
    exactCollisionCount: collisionPairCount,
    collisionPairCount,
    pass: collisionPairCount === 0,
    worstExamples: collisionGroups
      .slice(0, WORST_EXAMPLE_LIMIT)
      .map((group) => ({
        normalizedDocumentSha256: hash(group.normalizedDocument),
        routeCount: group.routes.length,
        pairCount: group.pairCount,
        routes: group.routes.slice(0, 12),
        normalizedPreview: group.normalizedDocument.slice(0, 480),
      })),
  };
}

function auditExactTextCollisions(recordsToAudit, field, enforcement) {
  const groupsByText = new Map();
  let emptyTextCount = 0;
  for (const record of recordsToAudit) {
    const value = clean(record.value);
    if (value.length === 0) emptyTextCount += 1;
    const group = groupsByText.get(value) ?? [];
    group.push(record.route);
    groupsByText.set(value, group);
  }
  const collisionGroups = [...groupsByText]
    .filter(([, routes]) => routes.length > 1)
    .map(([value, routes]) => ({
      value,
      routes: [...routes].sort(),
      pairCount: (routes.length * (routes.length - 1)) / 2,
    }))
    .sort(
      (left, right) =>
        right.pairCount - left.pairCount ||
        left.routes[0].localeCompare(right.routes[0]),
    );
  const exactCollisionCount = collisionGroups.reduce(
    (total, group) => total + group.pairCount,
    0,
  );
  return {
    field,
    enforcement,
    recordCount: recordsToAudit.length,
    emptyTextCount,
    uniqueTextCount: groupsByText.size,
    collisionGroupCount: collisionGroups.length,
    collisionDocumentCount: new Set(
      collisionGroups.flatMap((group) => group.routes),
    ).size,
    exactCollisionCount,
    pass: emptyTextCount === 0 && exactCollisionCount === 0,
    worstExamples: collisionGroups
      .slice(0, WORST_EXAMPLE_LIMIT)
      .map((group) => ({
        textSha256: hash(group.value),
        routeCount: group.routes.length,
        pairCount: group.pairCount,
        routes: group.routes.slice(0, 12),
        preview: group.value.slice(0, 480),
      })),
  };
}

function auditRenderedBannedVisibleCopy(documents) {
  const violations = [];
  for (const document of documents) {
    for (const block of document.allRenderedBlocks) {
      for (const banned of RENDERED_BANNED_VISIBLE_PATTERNS) {
        for (const match of block.value.matchAll(banned.pattern)) {
          violations.push({
            patternId: banned.id,
            route: document.route,
            id: block.id,
            match: match[0],
            value: block.value,
          });
        }
      }
    }
  }
  return {
    enforcement:
      "hard gate: banned technical/address-audit and Korean list-order wording must have zero actual rendered occurrences",
    patterns: RENDERED_BANNED_VISIBLE_PATTERNS.map(({ id, source }) => ({
      id,
      source,
    })),
    renderedDocumentCount: documents.length,
    renderedBlockCount: documents.reduce(
      (total, document) => total + document.allRenderedBlocks.length,
      0,
    ),
    occurrenceCount: violations.length,
    violatingDocumentCount: new Set(
      violations.map((violation) => violation.route),
    ).size,
    pass: violations.length === 0,
    examples: violations.slice(0, WORST_EXAMPLE_LIMIT),
  };
}

function auditContentSourceSelection(source) {
  const violations = [];
  for (const [lineIndex, line] of source.split(/\r?\n/u).entries()) {
    for (const forbidden of CONTENT_SOURCE_SELECTION_PATTERNS) {
      const match = line.match(forbidden.pattern);
      if (match) {
        violations.push({
          patternId: forbidden.id,
          line: lineIndex + 1,
          match: match[0],
          source: line.trim(),
        });
      }
    }
  }
  return {
    enforcement:
      "hard gate: src/lib/content.ts must not select customer copy with getRegionOrdinal, profile, or seed",
    patterns: CONTENT_SOURCE_SELECTION_PATTERNS.map(({ id }) => id),
    occurrenceCount: violations.length,
    pass: violations.length === 0,
    examples: violations.slice(0, WORST_EXAMPLE_LIMIT),
  };
}

function regionalFactTokenEntries(node, model) {
  const targetLabels = new Set(TARGET_REGION_LABELS_BY_PATH.get(node.path));
  const entriesByToken = new Map();
  function addToken(value, category) {
    const token = clean(value ?? "");
    if (
      token.length < 2 ||
      targetLabels.has(token) ||
      BRAND_LABELS.some(
        (brand) => brand.toLowerCase() === token.toLowerCase(),
      )
    ) {
      return;
    }
    const categories = entriesByToken.get(token) ?? new Set();
    categories.add(category);
    entriesByToken.set(token, categories);
  }
  function addNodeLabels(related, category) {
    for (const label of [
      related.qualifiedName,
      related.displayName,
      getRegionHeadingLabel(related),
      getSearchRegionLabel(related),
      getKeywordRegionLabel(related),
      shortenRegionSearchName(related.qualifiedName),
    ]) {
      addToken(label, category);
    }
  }

  const parent = getParentNode(node);
  if (parent) addNodeLabels(parent, "parent");
  for (const child of getDirectChildren(node)) {
    const childNode = nodeByPath.get(child.path);
    if (childNode) addNodeLabels(childNode, "child");
    addToken(child.name, "child");
  }
  if (parent) {
    for (const sibling of getDirectChildren(parent)) {
      if (sibling.path === node.path) continue;
      const siblingNode = nodeByPath.get(sibling.path);
      if (siblingNode) addNodeLabels(siblingNode, "sibling");
      addToken(sibling.name, "sibling");
    }
  }
  for (const alias of node.representative?.sourceNames ?? []) {
    addToken(alias, "alias");
  }
  for (const area of node.representative?.legalAreas ?? []) {
    addToken(area.name, "legal-area");
  }
  for (const breadcrumb of model.breadcrumbs) {
    if (
      breadcrumb.path !== node.path &&
      nodeByPath.has(breadcrumb.path)
    ) {
      addToken(breadcrumb.name, "breadcrumb-context");
    }
  }
  for (const item of model.gallery.items) {
    if (item.path !== node.path) addToken(item.name, "contextual-link");
  }

  return [...entriesByToken]
    .map(([token, categories]) => ({
      token,
      categories: [...categories].sort(),
    }))
    .sort(
      (left, right) =>
        right.token.length - left.token.length ||
        left.token.localeCompare(right.token),
    );
}

function isPrimaryProseBlock(block) {
  return (
    block.id.startsWith("opening:hook:") ||
    block.id.includes(":paragraph:")
  );
}

function isRegionalFactProseBlock(block) {
  return (
    block.id.startsWith("movement:regional-coverage:paragraph:") ||
    block.id.startsWith("movement:local-service-scope:paragraph:") ||
    block.id.startsWith("directory:paragraph:")
  );
}

function buildRegionalFactAudit(recordsToAudit) {
  const pageMetrics = [];
  const regionalFactProseDocuments = [];
  for (const { node, model } of recordsToAudit) {
    const primaryBlocks = renderedPrimaryBlocks(model);
    const primaryProseBlocks = primaryBlocks.filter(isPrimaryProseBlock);
    const tokenEntries = regionalFactTokenEntries(node, model);
    const renderedText = model.renderedSurface
      .map((block) => block.value)
      .join("\n");
    const renderedTokenEntries = tokenEntries.filter(({ token }) =>
      renderedText.includes(token),
    );
    const proseFactBlocks = primaryProseBlocks
      .filter(isRegionalFactProseBlock)
      .map((block) => ({
        ...block,
        source: block.id.startsWith("directory:")
          ? "regional-directory-prose"
          : "regional-service-scope-prose",
        visibleCharacters: visibleCharacterCount(block.value),
        factualTokens: renderedTokenEntries.filter(({ token }) =>
          block.value.includes(token),
        ),
      }))
      .filter(
        (block) =>
          block.visibleCharacters >=
            MINIMUM_REGIONAL_FACT_BLOCK_VISIBLE_CHARACTERS &&
          block.factualTokens.length > 0,
      );
    const galleryFactBlocks = model.gallery.items
      .filter((item) => item.path !== node.path)
      .map((item, index) => {
        const value = `${item.name} ${item.countLabel}`;
        return {
          id: `regional-gallery-card:${index}`,
          value,
          classification: "geography+navigation-fact",
          source: "contextual-link-card",
          visibleCharacters: visibleCharacterCount(value),
          factualTokens: tokenEntries.filter(({ token }) =>
            item.name.includes(token),
          ),
        };
      })
      .filter(
        (block) =>
          block.visibleCharacters >=
            MINIMUM_REGIONAL_FACT_BLOCK_VISIBLE_CHARACTERS &&
          block.factualTokens.length > 0,
      );
    const factBlocks = [...proseFactBlocks, ...galleryFactBlocks];
    const totalCharacters = primaryProseBlocks.reduce(
      (total, block) => total + visibleCharacterCount(block.value),
      0,
    );
    const pageSpecificCharacters = proseFactBlocks.reduce(
      (total, block) => total + block.visibleCharacters,
      0,
    );
    const pageSpecificShare =
      totalCharacters === 0 ? 0 : pageSpecificCharacters / totalCharacters;
    const verifiedFactBlockCount = factBlocks.filter((block) =>
      block.factualTokens.some(({ token }) => block.value.includes(token)),
    ).length;
    const verifiedFactProseBlockCount = proseFactBlocks.filter((block) =>
      block.factualTokens.some(({ token }) => block.value.includes(token)),
    ).length;
    const distinctRenderedFactualTokens = new Set(
      factBlocks.flatMap((block) =>
        block.factualTokens.map(({ token }) => token),
      ),
    );
    const contextualNonSelfLinks = new Set(
      [
        ...model.breadcrumbs.map((item) => item.path),
        ...model.gallery.items.map((item) => item.path),
        model.gallery.guide.actionPath,
      ].filter((item) => item !== node.path),
    );
    pageMetrics.push({
      route: node.path,
      auditSurfaceBlockCount: primaryProseBlocks.length,
      excludedHeadingActionBlockCount:
        primaryBlocks.length - primaryProseBlocks.length,
      availableFactualTokenCount: tokenEntries.length,
      renderedFactualTokenCount: renderedTokenEntries.length,
      distinctAttributedFactualTokenCount:
        distinctRenderedFactualTokens.size,
      factBlockCount: factBlocks.length,
      regionalFactProseBlockCount: proseFactBlocks.length,
      regionalGalleryFactBlockCount: galleryFactBlocks.length,
      regionalGalleryFactCharacters: galleryFactBlocks.reduce(
        (total, block) => total + block.visibleCharacters,
        0,
      ),
      verifiedFactBlockCount,
      verifiedFactProseBlockCount,
      contextualNonSelfLinkCount: contextualNonSelfLinks.size,
      totalCharacters,
      pageSpecificCharacters,
      pageSpecificShare,
      factBlockExamples: factBlocks.slice(0, 5).map((block) => ({
        id: block.id,
        source: block.source,
        value: block.value,
        visibleCharacters: block.visibleCharacters,
        factualTokens: block.factualTokens.slice(0, 5),
      })),
    });
    regionalFactProseDocuments.push({
      node,
      route: node.path,
      blocks: proseFactBlocks.map((block) => ({
        id: block.id,
        value: block.value,
      })),
      targetNormalizedText: targetNormalize(
        proseFactBlocks.map((block) => block.value).join("\n"),
        node,
      ),
    });
  }

  const shares = Float64Array.from(
    pageMetrics.map((metric) => metric.pageSpecificShare),
  );
  shares.sort();
  const belowMinimumFactBlocks = pageMetrics.filter(
    (metric) =>
      metric.regionalFactProseBlockCount <
      MINIMUM_REGIONAL_FACT_BLOCKS_PER_PAGE,
  );
  const unverifiedFactBlocks = pageMetrics.filter(
    (metric) =>
      metric.verifiedFactProseBlockCount !==
      metric.regionalFactProseBlockCount,
  );
  const belowMinimumContextualLinks = pageMetrics.filter(
    (metric) => metric.contextualNonSelfLinkCount < 3,
  );
  const belowMinimumPageSpecificShare = pageMetrics.filter(
    (metric) =>
      metric.pageSpecificShare < MINIMUM_PAGE_SPECIFIC_CHARACTER_SHARE,
  );
  const violatingRoutes = new Set(
    [
      ...belowMinimumFactBlocks,
      ...unverifiedFactBlocks,
      ...belowMinimumPageSpecificShare,
    ].map((metric) => metric.route),
  );
  return {
    regionalFactProseDocuments,
    report: {
      enforcement:
        "hard gate: each page needs at least three substantive regional-fact prose blocks whose factual tokens render and at least 25% page-specific prose characters",
      attribution:
        "A regional fact block must be actual regional-coverage/local-service-scope/directory prose or an actual grouped gallery card, contain a rendered parent/child/sibling/alias/legal-area/breadcrumb/contextual-link token, and meet the 24-visible-character minimum. Current target-name presence alone never qualifies.",
      denominator:
        "Page-specific prose share divides attributed regional-coverage/local-service-scope/directory prose characters by all primary hook/paragraph prose characters. Contextual gallery cards and non-self links are independently verified diagnostics and never satisfy the prose-block minimum or inflate the prose-share numerator/denominator. Common headings, actions, decorative copy, and short verified operating chrome are excluded.",
      documentCount: pageMetrics.length,
      thresholds: {
        minimumRegionalFactProseBlocksPerPage:
          MINIMUM_REGIONAL_FACT_BLOCKS_PER_PAGE,
        minimumRegionalFactBlockVisibleCharacters:
          MINIMUM_REGIONAL_FACT_BLOCK_VISIBLE_CHARACTERS,
        minimumPageSpecificCharacterShare:
          MINIMUM_PAGE_SPECIFIC_CHARACTER_SHARE,
      },
      minimumRegionalFactBlocks: Math.min(
        ...pageMetrics.map((metric) => metric.factBlockCount),
      ),
      minimumRegionalFactProseBlocks: Math.min(
        ...pageMetrics.map((metric) => metric.regionalFactProseBlockCount),
      ),
      minimumDistinctAttributedFactualTokens: Math.min(
        ...pageMetrics.map(
          (metric) => metric.distinctAttributedFactualTokenCount,
        ),
      ),
      minimumContextualNonSelfLinks: Math.min(
        ...pageMetrics.map((metric) => metric.contextualNonSelfLinkCount),
      ),
      pageSpecificCharacterShareP05: roundMetric(percentile(shares, 0.05)),
      pageSpecificCharacterShareP50: roundMetric(percentile(shares, 0.5)),
      pageSpecificCharacterShareP95: roundMetric(percentile(shares, 0.95)),
      minimumPageSpecificCharacterShare: roundMetric(shares[0] ?? 0),
      maximumPageSpecificCharacterShare: roundMetric(shares.at(-1) ?? 0),
      violationCounts: {
        belowMinimumRegionalFactProseBlocks: belowMinimumFactBlocks.length,
        unverifiedRegionalFactProseBlocks: unverifiedFactBlocks.length,
        belowMinimumPageSpecificCharacterShare:
          belowMinimumPageSpecificShare.length,
      },
      contextualNavigationDiagnostic: {
        enforcement:
          "diagnostic-only: grouped gallery-card facts and actual non-self contextual links do not change release status",
        minimumContextualNonSelfLinks: Math.min(
          ...pageMetrics.map((metric) => metric.contextualNonSelfLinkCount),
        ),
        routesBelowThreeContextualNonSelfLinks:
          belowMinimumContextualLinks.length,
        minimumRegionalGalleryFactBlocks: Math.min(
          ...pageMetrics.map(
            (metric) => metric.regionalGalleryFactBlockCount,
          ),
        ),
        maximumRegionalGalleryFactBlocks: Math.max(
          ...pageMetrics.map(
            (metric) => metric.regionalGalleryFactBlockCount,
          ),
        ),
      },
      violatingDocumentCount: violatingRoutes.size,
      pass: violatingRoutes.size === 0,
      violationExamples: pageMetrics
        .filter((metric) => violatingRoutes.has(metric.route))
        .slice(0, WORST_EXAMPLE_LIMIT)
        .map((metric) => ({
          route: metric.route,
          regionalFactProseBlockCount: metric.regionalFactProseBlockCount,
          verifiedFactProseBlockCount:
            metric.verifiedFactProseBlockCount,
          contextualNonSelfLinkCount: metric.contextualNonSelfLinkCount,
          pageSpecificShare: roundMetric(metric.pageSpecificShare),
          reasons: [
            ...(metric.regionalFactProseBlockCount <
            MINIMUM_REGIONAL_FACT_BLOCKS_PER_PAGE
              ? ["below-minimum-regional-fact-prose-blocks"]
              : []),
            ...(metric.verifiedFactProseBlockCount !==
            metric.regionalFactProseBlockCount
              ? ["unverified-regional-fact-prose-block"]
              : []),
            ...(metric.pageSpecificShare <
            MINIMUM_PAGE_SPECIFIC_CHARACTER_SHARE
              ? ["below-minimum-page-specific-character-share"]
              : []),
          ],
        })),
      worstExamples: [...pageMetrics]
        .sort(
          (left, right) =>
            left.pageSpecificShare - right.pageSpecificShare ||
            left.factBlockCount - right.factBlockCount ||
            left.route.localeCompare(right.route),
        )
        .slice(0, WORST_EXAMPLE_LIMIT)
        .map((metric) => ({
          ...metric,
          pageSpecificShare: roundMetric(metric.pageSpecificShare),
        })),
    },
  };
}

function signatureVocabularyReceipt(actualValues, allowedValues) {
  const actual = [...new Set(actualValues)].sort();
  const allowed = [...allowedValues].sort();
  const actualSet = new Set(actual);
  const allowedSet = new Set(allowed);
  const missing = allowed.filter((value) => !actualSet.has(value));
  const unexpected = actual.filter((value) => !allowedSet.has(value));
  return {
    allowedCount: allowed.length,
    actualCount: actual.length,
    allowed,
    actual,
    missing,
    unexpected,
    pass: missing.length === 0 && unexpected.length === 0,
  };
}

function auditAllowedCommonSignatures(recordsToAudit) {
  const normalizedHeadings = [];
  const actions = [];
  const verifiedOperatingFacts = [];
  let normalizedHeadingOccurrenceCount = 0;
  let actionOccurrenceCount = 0;
  let verifiedOperatingFactOccurrenceCount = 0;

  for (const { node, model } of recordsToAudit) {
    for (const block of model.renderedSurface) {
      if (
        block.id === "directory:heading" ||
        /^movement:[^:]+:heading$/u.test(block.id)
      ) {
        normalizedHeadings.push(targetNormalize(block.value, node));
        normalizedHeadingOccurrenceCount += 1;
      }
      if (
        /^opening:action:(?:primary|score)$/u.test(block.id) ||
        /^movement:[^:]+:action$/u.test(block.id) ||
        block.id === "directory:action" ||
        block.id === "final:phone"
      ) {
        actions.push(clean(block.value.normalize("NFKC")));
        actionOccurrenceCount += 1;
      }
      if (block.classification === "verified-operating-fact") {
        verifiedOperatingFacts.push(clean(block.value.normalize("NFKC")));
        verifiedOperatingFactOccurrenceCount += 1;
      }
    }
  }

  const headingReceipt = signatureVocabularyReceipt(
    normalizedHeadings,
    ALLOWED_COMMON_TARGET_NORMALIZED_HEADING_SIGNATURES,
  );
  const actionReceipt = signatureVocabularyReceipt(
    actions,
    ALLOWED_COMMON_ACTION_SIGNATURES,
  );
  const operatingReceipt = signatureVocabularyReceipt(
    verifiedOperatingFacts,
    ALLOWED_COMMON_VERIFIED_OPERATING_SIGNATURES,
  );
  return {
    enforcement:
      "hard gate: common service headings, actions, and short verified operating facts are excluded from regional-fact uniqueness attribution only when their complete vocabularies exactly match these explicit allowlists",
    exclusionBoundary:
      "Only movement/directory headings, opening/movement/directory/final actions, and rendered entries classified verified-operating-fact are allowlisted. Customer-guidance paragraphs never enter this exception.",
    targetNormalizedServiceHeadings: {
      occurrenceCount: normalizedHeadingOccurrenceCount,
      ...headingReceipt,
    },
    actions: {
      occurrenceCount: actionOccurrenceCount,
      ...actionReceipt,
    },
    shortVerifiedOperatingFacts: {
      occurrenceCount: verifiedOperatingFactOccurrenceCount,
      ...operatingReceipt,
    },
    pass: headingReceipt.pass && actionReceipt.pass && operatingReceipt.pass,
  };
}

function blockKey(value, mode, node) {
  if (mode === "exact") return clean(value.normalize("NFKC"));
  if (mode === "target-normalized") return targetNormalize(value, node);
  throw new Error(`MASSAGE_DAY_COPY_AUDIT_BLOCK_MODE_INVALID:${mode}`);
}

function auditRepeatedBlockShare(documents, mode, limit) {
  const keyOccurrences = new Map();
  const documentBlocks = documents.map((document, documentIndex) => {
    const blocks = document.blocks
      .map((block, blockIndex) => ({
        ...block,
        blockIndex,
        visibleCharacters: visibleCharacterCount(block.value),
        key: blockKey(block.value, mode, document.node),
      }))
      .filter(
        (block) =>
          block.visibleCharacters >= MINIMUM_BLOCK_VISIBLE_CHARACTERS &&
          block.key.length > 0,
      );
    for (const block of blocks) {
      const occurrence = {
        documentIndex,
        route: document.route,
        id: block.id,
        value: block.value,
        visibleCharacters: block.visibleCharacters,
      };
      const group = keyOccurrences.get(block.key) ?? [];
      group.push(occurrence);
      keyOccurrences.set(block.key, group);
    }
    return blocks;
  });

  const repeatedKeys = new Set();
  let repeatedKeyCollisionPairCount = 0;
  let maximumRepeatedKeyDocumentFrequency = 0;
  for (const [key, occurrences] of keyOccurrences) {
    const documentFrequency = new Set(
      occurrences.map((item) => item.documentIndex),
    ).size;
    if (documentFrequency > 1) {
      repeatedKeys.add(key);
      repeatedKeyCollisionPairCount +=
        (documentFrequency * (documentFrequency - 1)) / 2;
      maximumRepeatedKeyDocumentFrequency = Math.max(
        maximumRepeatedKeyDocumentFrequency,
        documentFrequency,
      );
    }
  }

  const documentMetrics = documents.map((document, documentIndex) => {
    const blocks = documentBlocks[documentIndex];
    const repeatedBlocks = blocks.filter((block) => repeatedKeys.has(block.key));
    const totalCharacters = blocks.reduce(
      (total, block) => total + block.visibleCharacters,
      0,
    );
    const repeatedCharacters = repeatedBlocks.reduce(
      (total, block) => total + block.visibleCharacters,
      0,
    );
    const share = totalCharacters === 0 ? 1 : repeatedCharacters / totalCharacters;
    return {
      route: document.route,
      auditedBlockCount: blocks.length,
      repeatedBlockCount: repeatedBlocks.length,
      totalCharacters,
      repeatedCharacters,
      share,
      repeatedBlocks,
    };
  });
  const sortedShares = Float64Array.from(
    documentMetrics.map((item) => item.share),
  );
  sortedShares.sort();
  const p95 = percentile(sortedShares, 0.95);
  const maximum = sortedShares.at(-1) ?? 0;
  const violations = documentMetrics.filter((item) => item.share > limit);
  const totalRepeatedCharacters = documentMetrics.reduce(
    (total, item) => total + item.repeatedCharacters,
    0,
  );
  const contributionByBlockId = new Map();
  for (let documentIndex = 0; documentIndex < documents.length; documentIndex += 1) {
    for (const block of documentBlocks[documentIndex]) {
      const repeated = repeatedKeys.has(block.key);
      const contribution = contributionByBlockId.get(block.id) ?? {
        id: block.id,
        documentCount: 0,
        repeatedDocumentCount: 0,
        totalCharacters: 0,
        repeatedCharacters: 0,
      };
      contribution.documentCount += 1;
      contribution.totalCharacters += block.visibleCharacters;
      if (repeated) {
        contribution.repeatedDocumentCount += 1;
        contribution.repeatedCharacters += block.visibleCharacters;
      }
      contributionByBlockId.set(block.id, contribution);
    }
  }
  const blockIdContributions = [...contributionByBlockId.values()]
    .map((contribution) => ({
      ...contribution,
      repeatedShareWithinBlockId: roundMetric(
        contribution.totalCharacters === 0
          ? 0
          : contribution.repeatedCharacters / contribution.totalCharacters,
      ),
      shareOfCorpusRepeatedCharacters: roundMetric(
        totalRepeatedCharacters === 0
          ? 0
          : contribution.repeatedCharacters / totalRepeatedCharacters,
      ),
    }))
    .sort(
      (left, right) =>
        right.repeatedCharacters - left.repeatedCharacters ||
        left.id.localeCompare(right.id),
    );
  const worstDocuments = [...documentMetrics]
    .sort(
      (left, right) =>
        right.share - left.share || left.route.localeCompare(right.route),
    )
    .slice(0, WORST_EXAMPLE_LIMIT)
    .map((item) => ({
      route: item.route,
      share: roundMetric(item.share),
      auditedBlockCount: item.auditedBlockCount,
      repeatedBlockCount: item.repeatedBlockCount,
      totalCharacters: item.totalCharacters,
      repeatedCharacters: item.repeatedCharacters,
      repeatedBlockExamples: item.repeatedBlocks
        .sort(
          (left, right) =>
            right.visibleCharacters - left.visibleCharacters ||
            left.id.localeCompare(right.id),
        )
        .slice(0, 4)
        .map((block) => ({
          id: block.id,
          value: block.value,
          visibleCharacters: block.visibleCharacters,
          documentFrequency: new Set(
            keyOccurrences
              .get(block.key)
              .map((occurrence) => occurrence.documentIndex),
          ).size,
        })),
    }));
  const repeatedGroups = [...repeatedKeys]
    .map((key) => {
      const occurrences = keyOccurrences.get(key);
      const documentFrequency = new Set(
        occurrences.map((item) => item.documentIndex),
      ).size;
      return {
        key,
        documentFrequency,
        occurrenceCount: occurrences.length,
        totalVisibleCharacters: occurrences.reduce(
          (total, item) => total + item.visibleCharacters,
          0,
        ),
        examples: occurrences.slice(0, 3).map((item) => ({
          route: item.route,
          id: item.id,
          value: item.value,
        })),
      };
    })
    .sort(
      (left, right) =>
        right.totalVisibleCharacters - left.totalVisibleCharacters ||
        right.documentFrequency - left.documentFrequency ||
        left.key.localeCompare(right.key),
    )
    .slice(0, WORST_EXAMPLE_LIMIT)
    .map((group) => ({
      normalizedOrExactKeyPreview: group.key.slice(0, 240),
      documentFrequency: group.documentFrequency,
      occurrenceCount: group.occurrenceCount,
      totalVisibleCharacters: group.totalVisibleCharacters,
      examples: group.examples,
    }));

  return {
    mode,
    documentCount: documents.length,
    minimumBlockVisibleCharacters: MINIMUM_BLOCK_VISIBLE_CHARACTERS,
    auditedBlockCount: documentBlocks.reduce(
      (total, blocks) => total + blocks.length,
      0,
    ),
    uniqueBlockKeyCount: keyOccurrences.size,
    repeatedBlockKeyCount: repeatedKeys.size,
    repeatedKeyCollisionPairCount,
    maximumRepeatedKeyDocumentFrequency,
    threshold: limit,
    thresholdComparison: "per-document share <= threshold",
    p95: roundMetric(p95),
    maximum: roundMetric(maximum),
    violatingDocumentCount: violations.length,
    pass: violations.length === 0 && maximum <= limit,
    totalRepeatedCharacters,
    blockIdContributionCount: blockIdContributions.length,
    blockIdContributions,
    worstDocuments,
    repeatedGroupExamples: repeatedGroups,
  };
}

function expectedRoEulo(stem) {
  const last = stem.codePointAt(stem.length - 1);
  if (!Number.isInteger(last) || last < 0xac00 || last > 0xd7a3) return null;
  const finalConsonant = (last - 0xac00) % 28;
  return finalConsonant === 0 || finalConsonant === 8 ? "로" : "으로";
}

function auditDynamicKoreanParticles(documents) {
  const explicitPattern = /[가-힣]+주으로/gu;
  const explicitViolations = [];
  const agreementViolations = [];
  let roEuloCandidatesInspected = 0;
  for (const document of documents) {
    for (const block of document.allRenderedBlocks) {
      for (const match of block.value.matchAll(explicitPattern)) {
        explicitViolations.push({
          route: document.route,
          id: block.id,
          match: match[0],
          value: block.value,
        });
      }
      for (const match of block.value.matchAll(DYNAMIC_RO_EULO_PATTERN)) {
        roEuloCandidatesInspected += 1;
        const expected = expectedRoEulo(match[1]);
        if (expected && match[2] !== expected) {
          agreementViolations.push({
            route: document.route,
            id: block.id,
            stem: match[1],
            actual: match[2],
            expected,
            value: block.value,
          });
        }
      }
    }
  }
  return {
    patterns: {
      explicitKnownBad: "[가-힣]+주으로",
      generalAgreement:
        "For every known region/alias/brand label directly followed by a particle: 로 after vowel or ㄹ, otherwise 으로",
    },
    dynamicLabelCount: DYNAMIC_JOSA_LABELS.length,
    renderedDocumentCount: documents.length,
    renderedBlockCount: documents.reduce(
      (total, document) => total + document.allRenderedBlocks.length,
      0,
    ),
    roEuloCandidatesInspected,
    explicitKnownBadCount: explicitViolations.length,
    agreementViolationCount: agreementViolations.length,
    pass:
      explicitViolations.length === 0 && agreementViolations.length === 0,
    explicitKnownBadExamples: explicitViolations.slice(0, WORST_EXAMPLE_LIMIT),
    agreementViolationExamples: agreementViolations.slice(
      0,
      WORST_EXAMPLE_LIMIT,
    ),
  };
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
    getRegionHeadingLabel(node),
    getSearchRegionLabel(node),
    getKeywordRegionLabel(node),
    getPrimaryRegionKeyword(node),
    shortenRegionSearchName(node.qualifiedName),
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
      ...(item.action ? [item.action.label] : []),
    ]),
  ];
}

function genericRuntimeCode() {
  return [
    'import { createHash } from "node:crypto";',
    'import { createRegionContent } from "./src/lib/content.ts";',
    'import * as regionLibrary from "./src/lib/regions.ts";',
    'const { ACTIVE_REGION_NODES } = regionLibrary;',
    'const brands = /마사지데이|마사지봄|마사지러브|콜미토닥이|랑테라피|필링홈타이|건마에반하다|혼혈마사지|GEONMAE BANHADA|HONHYEOL/giu;',
    'const digest = (value) => createHash("sha256").update(value).digest("hex");',
    'const clean = (value) => value.replace(/\\s+/gu, " ").trim();',
    'const substantive = (value) => (value.match(/[가-힣]/gu) ?? []).length >= 12;',
    'function normalize(value, node) {',
    '  const labels = [node.qualifiedName, node.displayName,',
    '    typeof regionLibrary.getRegionHeadingLabel === "function" ? regionLibrary.getRegionHeadingLabel(node) : "",',
    '    typeof regionLibrary.getSearchRegionLabel === "function" ? regionLibrary.getSearchRegionLabel(node) : "",',
    '    typeof regionLibrary.getKeywordRegionLabel === "function" ? regionLibrary.getKeywordRegionLabel(node) : ""]',
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

function occurrenceCount(value, needle) {
  return value.split(needle).length - 1;
}

const records = ACTIVE_REGION_NODES.map((node) => ({
  node,
  content: createRegionContent(node),
  model: createRegionPageModel(node),
}));
const broadRecords = records.filter(({ node }) => isBroadDetailRegion(node));
const compactRecords = records.filter(({ node }) => !isBroadDetailRegion(node));
const renderedPrimaryDocuments = records.map(({ node, model }) => {
  const blocks = renderedPrimaryBlocks(model);
  const primaryProseBlocks = blocks.filter(isPrimaryProseBlock);
  const originalText = blocks.map((block) => block.value).join("\n");
  const primaryProseText = primaryProseBlocks
    .map((block) => block.value)
    .join("\n");
  const normalizedText = strongNormalize(originalText);
  const tokens = visibleWordTokens(originalText);
  const trigrams = wordTrigramSet(tokens);
  if (tokens.length < 3 || trigrams.size === 0) {
    throw new Error(
      `MASSAGE_DAY_COPY_AUDIT_RENDERED_PRIMARY_CONTENT_TOO_SHORT:${node.path}`,
    );
  }
  return {
    node,
    route: node.path,
    blocks,
    allRenderedBlocks: model.renderedSurface,
    originalText,
    primaryProseText,
    targetNormalizedPrimaryProseText: targetNormalize(primaryProseText, node),
    normalizedText,
    tokens,
    trigrams,
  };
});
const renderedSemanticSectionDocuments = records.map(({ node, model }) => ({
  node,
  route: node.path,
  blocks: renderedSemanticSectionBlocks(model),
}));
const internalNearDuplicateAudit = auditInternalNearDuplicates(
  renderedPrimaryDocuments,
);
const strongNormalizedFullDocumentCollisionAudit =
  auditStrongNormalizedFullDocumentCollisions(renderedPrimaryDocuments);
const rawExactFieldCollisionAudits = {
  title: auditExactTextCollisions(
    records.map(({ node, content }) => ({
      route: node.path,
      value: content.title,
    })),
    "title",
    "hard gate: raw title exact collision count must be zero",
  ),
  description: auditExactTextCollisions(
    records.map(({ node, content }) => ({
      route: node.path,
      value: content.description,
    })),
    "description",
    "hard gate: raw description exact collision count must be zero",
  ),
  h1: auditExactTextCollisions(
    records.map(({ node, content }) => ({
      route: node.path,
      value: content.h1,
    })),
    "h1",
    "hard gate: raw H1 exact collision count must be zero",
  ),
  fullPrimaryDocument: auditExactTextCollisions(
    renderedPrimaryDocuments.map(({ route, originalText }) => ({
      route,
      value: originalText,
    })),
    "full-primary-document",
    "hard gate: raw full primary rendered-document exact collision count must be zero",
  ),
};
const rawExactCollisionAudit = {
  enforcement:
    "hard gate: raw title, description, H1, and full primary rendered document each require zero exact collision pairs and zero empty records",
  fields: rawExactFieldCollisionAudits,
  totalExactCollisionCount: Object.values(rawExactFieldCollisionAudits).reduce(
    (total, audit) => total + audit.exactCollisionCount,
    0,
  ),
  pass: Object.values(rawExactFieldCollisionAudits).every(
    (audit) => audit.pass,
  ),
};
const targetNormalizedPrimaryProseCollisionAudit = auditExactTextCollisions(
  renderedPrimaryDocuments.map(
    ({ route, targetNormalizedPrimaryProseText }) => ({
      route,
      value: targetNormalizedPrimaryProseText,
    }),
  ),
  "brand-current-target-normalized-full-primary-prose",
  "hard gate: brand/current-target-only normalized full primary prose exact collision count must be zero",
);
const regionalFactAudit = buildRegionalFactAudit(records);
const regionalFactProseFullCollisionAudit = auditExactTextCollisions(
  regionalFactAudit.regionalFactProseDocuments.map(
    ({ route, targetNormalizedText }) => ({
      route,
      value: targetNormalizedText,
    }),
  ),
  "target-normalized-full-regional-fact-prose",
  "hard gate: brand/current-target-only normalized combined regionalFactSignature exact collision count must be zero",
);
const regionalFactProseRepeatedBlockReceipt = auditRepeatedBlockShare(
  regionalFactAudit.regionalFactProseDocuments,
  "target-normalized",
  NORMALIZED_REPEATED_BLOCK_SHARE_LIMIT,
);
const regionalFactProseReuseAudit = {
  enforcement:
    "hard gate: the combined brand/current-target-normalized regionalFactSignature must be unique across all 1,291 routes; individual regional-fact paragraph reuse is diagnostic-only",
  pass: regionalFactProseFullCollisionAudit.pass,
  combinedRegionalFactSignatureExactCollisions:
    regionalFactProseFullCollisionAudit,
  individualBlockReuseDiagnostic: {
    enforcement:
      "diagnostic-only: individual regional-fact paragraph frequency and repeated-character share do not change release status",
    ...regionalFactProseRepeatedBlockReceipt,
  },
};
const allowedCommonSignatureAudit = auditAllowedCommonSignatures(records);
const exactRepeatedBlockAudit = auditRepeatedBlockShare(
  renderedPrimaryDocuments,
  "exact",
  EXACT_REPEATED_BLOCK_SHARE_LIMIT,
);
const targetNormalizedRepeatedBlockAudit = auditRepeatedBlockShare(
  renderedPrimaryDocuments,
  "target-normalized",
  NORMALIZED_REPEATED_BLOCK_SHARE_LIMIT,
);
const semanticSectionExactRepeatedBlockDiagnostic = auditRepeatedBlockShare(
  renderedSemanticSectionDocuments,
  "exact",
  EXACT_REPEATED_BLOCK_SHARE_LIMIT,
);
const semanticSectionTargetRepeatedBlockDiagnostic = auditRepeatedBlockShare(
  renderedSemanticSectionDocuments,
  "target-normalized",
  NORMALIZED_REPEATED_BLOCK_SHARE_LIMIT,
);
const dynamicKoreanParticleAudit = auditDynamicKoreanParticles(
  renderedPrimaryDocuments,
);
const renderedBannedVisibleCopyAudit = auditRenderedBannedVisibleCopy(
  renderedPrimaryDocuments,
);

const targetExact = new Map();
const targetNormalized = new Map();
for (const value of targetSourceValues()) {
  addValue(targetExact, value);
  addValue(targetNormalized, value, normalizeSource);
}
for (const { node, content, model } of records) {
  for (const value of regionalContentValues(content)) {
    addValue(targetExact, value);
    addValue(targetNormalized, value, (entry) =>
      normalizeRegional(entry, node),
    );
  }
  for (const copy of model.renderedSurface) {
    if (["geography", "navigation-fact", "decorative"].includes(copy.classification)) {
      continue;
    }
    addValue(targetExact, copy.value);
    addValue(targetNormalized, copy.value, (entry) =>
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
const primaryContract = records.map(({ node, content, model }) => {
  const primaryKeyword = getPrimaryRegionKeyword(node);
  const firstSection = content.sections[0];
  const firstOneHundredWords = [
    ...content.hooks,
    ...firstSection.paragraphs,
  ]
    .join(" ")
    .split(/\s+/u)
    .slice(0, 100)
    .join(" ");
  const renderedMainCopy = [
    content.h1,
    ...content.hooks,
    ...content.sections.flatMap((item) => [
      item.heading,
      ...item.paragraphs,
    ]),
  ].join("\n");
  const contextualRegionLinks = new Set(
    [
      ...model.breadcrumbs.map((item) => item.path),
      ...model.gallery.items.map((item) => item.path),
      model.gallery.guide.actionPath,
    ].filter((item) => item !== node.path),
  );
  return {
    primaryKeyword,
    titleStarts: content.title.startsWith(primaryKeyword),
    titleExactOnce: occurrenceCount(content.title, primaryKeyword) === 1,
    h1ExactOnce: occurrenceCount(content.h1, primaryKeyword) === 1,
    firstOneHundredWords: firstOneHundredWords.includes(primaryKeyword),
    serviceIntroduction:
      firstSection.id === "service-introduction" &&
      firstSection.paragraphs.join(" ").includes(primaryKeyword),
    exactH2Count: content.sections.filter((item) =>
      item.heading.includes(primaryKeyword),
    ).length,
    renderedMainExactCount: occurrenceCount(renderedMainCopy, primaryKeyword),
    priceLink: content.sections.some(
      (item) => item.id === "course-price-link" && item.action?.path === "/pricing/",
    ),
    guideLink: content.sections.some(
      (item) => item.id === "use-flow" && item.action?.path === "/guide/",
    ),
    contextualRegionLinks: contextualRegionLinks.size,
    galleryHasSelfLink: model.gallery.items.some((item) => item.path === node.path),
  };
});
const regionExperienceSource = readFileSync(
  path.join(ROOT, "src/components/RegionExperience.tsx"),
  "utf8",
);
const commonFullRegionBlockSourceViolations = [
  { id: "full-price-table", identifier: "COURSE_GROUPS" },
  { id: "full-service-faq", identifier: "SERVICE_FAQS" },
].flatMap(({ id, identifier }) =>
  [...regionExperienceSource.matchAll(new RegExp(`\\b${identifier}\\b`, "gu"))]
    .map((match) => ({
      id,
      identifier,
      offset: match.index,
    })),
);
const commonFullRegionBlockSourceAudit = {
  enforcement:
    "hard gate: regional page rendering source must not embed the shared full price table or full service FAQ corpus",
  source: "src/components/RegionExperience.tsx",
  forbiddenIdentifiers: ["COURSE_GROUPS", "SERVICE_FAQS"],
  occurrenceCount: commonFullRegionBlockSourceViolations.length,
  pass: commonFullRegionBlockSourceViolations.length === 0,
  examples: commonFullRegionBlockSourceViolations.slice(
    0,
    WORST_EXAMPLE_LIMIT,
  ),
};
const contentSource = readFileSync(
  path.join(ROOT, "src/lib/content.ts"),
  "utf8",
);
const contentSourceSelectionAudit = auditContentSourceSelection(contentSource);
const auditScriptSource = readFileSync(
  path.join(ROOT, "scripts/audit-copy-duplication.mjs"),
  "utf8",
);
const platformSpecificHomePrefix = `${path.sep}Users${path.sep}`;
const repositoryRootsArePortable =
  !auditScriptSource.includes(platformSpecificHomePrefix) &&
  AUTHORITATIVE_REPOSITORIES.every((repository) =>
    repository.root.startsWith(DOCUMENTS_ROOT + path.sep),
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
const currentRegionSentencePrefixCounts = records.map(({ node, content }) => {
  const labels = [
    node.qualifiedName,
    isBroadDetailRegion(node)
      ? shortenRegionSearchName(node.displayName)
      : node.displayName,
  ];
  const primaryProse = [
    ...content.hooks,
    ...content.sections.flatMap((item) => item.paragraphs),
  ];
  return primaryProse.filter((value) =>
    labels.some((label) => value.startsWith(label)),
  ).length;
});
const descriptionLengths = records.map(({ content }) => content.description.length);
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
  currentRegionSentencePrefixes: {
    enforcement:
      "hard gate: retain four regional sentence openings but cap them at eight so shared service facts read naturally instead of receiving cosmetic route prefixes",
    minimum: Math.min(...currentRegionSentencePrefixCounts),
    maximum: Math.max(...currentRegionSentencePrefixCounts),
    pass:
      Math.min(...currentRegionSentencePrefixCounts) >= 4 &&
      Math.max(...currentRegionSentencePrefixCounts) <= 8,
  },
  descriptionLengths: {
    enforcement: "hard gate: every regional meta description is 70–180 characters",
    minimum: Math.min(...descriptionLengths),
    maximum: Math.max(...descriptionLengths),
    pass:
      Math.min(...descriptionLengths) >= 70 &&
      Math.max(...descriptionLengths) <= 180,
  },
  normalizedTitleForms: new Set(normalizedTitles).size,
  normalizedTitleMaxReuse: maxFrequency(normalizedTitles),
  normalizedDescriptionForms: new Set(normalizedDescriptions).size,
  normalizedDescriptionMaxReuse: maxFrequency(normalizedDescriptions),
  normalizedH1Forms: new Set(normalizedH1s).size,
  normalizedH1MaxReuse: maxFrequency(normalizedH1s),
  uniquePrimaryKeywords: new Set(
    primaryContract.map((item) => item.primaryKeyword),
  ).size,
  titlesStartingWithPrimary: primaryContract.filter((item) => item.titleStarts)
    .length,
  titlesWithPrimaryExactlyOnce: primaryContract.filter(
    (item) => item.titleExactOnce,
  ).length,
  h1WithPrimaryExactlyOnce: primaryContract.filter((item) => item.h1ExactOnce)
    .length,
  firstHundredWordsWithPrimary: primaryContract.filter(
    (item) => item.firstOneHundredWords,
  ).length,
  serviceIntroductionsWithPrimary: primaryContract.filter(
    (item) => item.serviceIntroduction,
  ).length,
  routesWithExactlyTwoPrimaryH2s: primaryContract.filter(
    (item) => item.exactH2Count === 2,
  ).length,
  renderedMainPrimaryMaxOccurrences: Math.max(
    ...primaryContract.map((item) => item.renderedMainExactCount),
  ),
  routesWithPriceLinks: primaryContract.filter((item) => item.priceLink).length,
  routesWithGuideLinks: primaryContract.filter((item) => item.guideLink).length,
  minimumContextualRegionLinks: Math.min(
    ...primaryContract.map((item) => item.contextualRegionLinks),
  ),
  gallerySelfLinks: primaryContract.filter((item) => item.galleryHasSelfLink)
    .length,
  commonFullRegionBlocksRemoved: commonFullRegionBlockSourceAudit.pass,
  uniqueNormalizedFullSignatures: new Set(fullSignatures).size,
  broadNormalizedSlotMaxReuse: Math.max(...broadSlotMaxima),
  compactNormalizedSlotMaxReuse: Math.max(...compactSlotMaxima),
  diagnosticOnlyCopyFormMetrics: {
    enforcement:
      "diagnostic-only; normalized H1 form count and normalized paragraph-slot reuse do not change release status",
    normalizedH1Forms: new Set(normalizedH1s).size,
    normalizedH1MaxReuse: maxFrequency(normalizedH1s),
    broadNormalizedSlotMaxReuse: Math.max(...broadSlotMaxima),
    compactNormalizedSlotMaxReuse: Math.max(...compactSlotMaxima),
  },
  broadRouteSetSha256: hash(
    broadRecords.map(({ node }) => node.path).sort().join("\n"),
  ),
  internalRenderedPrimaryContentAudit: {
    scope: {
      description:
        "Visible primary copy in rendered order: H1, opening hooks, movement headings/paragraphs/actions, then the terminal regional-directory heading/paragraphs/action. Decorative, scene, breadcrumb, gallery-card, and shared final-contact chrome are excluded.",
      documentCount: renderedPrimaryDocuments.length,
      blockCount: renderedPrimaryDocuments.reduce(
        (total, document) => total + document.blocks.length,
        0,
      ),
      minimumBlocksPerDocument: Math.min(
        ...renderedPrimaryDocuments.map((document) => document.blocks.length),
      ),
      maximumBlocksPerDocument: Math.max(
        ...renderedPrimaryDocuments.map((document) => document.blocks.length),
      ),
    },
    normalization: {
      strongAllRelatedLabels: {
        purpose:
          "Diagnostic-only exhaustive Jaccard and strong full-document exact-collision receipts.",
        description:
          "NFKC plus whitespace cleanup; remove every listed portfolio brand, every globally known qualified/display/heading/search/keyword/shortened/alias/legal-area region label (covering each document's current, parent, sibling, and child labels), and every Unicode numeric run; lowercase before tokenization.",
        steps: [
          "Unicode NFKC normalization",
          "portfolio brand removal (case-insensitive)",
          "global region-label removal (longest label first)",
          "Unicode number removal, including punctuation-joined runs",
          "lowercase and whitespace collapse",
        ],
        brandLabels: {
          count: BRAND_LABELS.length,
          labels: BRAND_LABELS,
        },
        regionLabels: {
          categoryCounts: Object.fromEntries(
            Object.entries(STRONG_REGION_LABEL_CATEGORIES).map(
              ([category, labels]) => [category, labels.length],
            ),
          ),
          globalUniqueCount: STRONG_REGION_LABELS.length,
          globalListSha256: hash(STRONG_REGION_LABELS.join("\n")),
          longestExamples: STRONG_REGION_LABELS.slice(0, 8),
          relationshipOccurrenceCounts,
          uniqueRelationshipNodeCounts: {
            current: relationshipPathSets.current.size,
            parent: relationshipPathSets.parent.size,
            sibling: relationshipPathSets.sibling.size,
            child: relationshipPathSets.child.size,
          },
        },
        numbers: {
          description:
            "Unicode Number runs, including runs joined by period, comma, colon, slash, or hyphen",
          pattern: "\\p{Number}+(?:[.,:/-]\\p{Number}+)*",
        },
        tokenization: {
          description:
            "Extract contiguous modern Hangul syllables or Latin letters from cleaned strong-normalized visible text; form a set of ordered word trigrams.",
          wordPattern: "[가-힣]+|[a-z]+",
          ngramSize: 3,
        },
      },
      targetRepeatedBlocks: {
        purpose:
          "Target-only normalization for hard primary/regional-fact prose exact-collision gates and diagnostic all-block repeated-share receipts.",
        description:
          "For each document independently, remove only that current node's qualified/display/heading/search/keyword/primary/shortened labels and portfolio brands. Numbers plus parent, child, sibling, alias, and legal-area names remain visible to the comparison.",
        currentLabelCategories: [
          "qualifiedName",
          "displayName",
          "headingLabel",
          "searchLabel",
          "keywordLabel",
          "primaryKeyword",
          "shortenedQualifiedName",
        ],
        preservationContract: [
          "parent names",
          "child names",
          "sibling names",
          "representative aliases",
          "legal-area names",
        ],
        routeCount: TARGET_REGION_LABELS_BY_PATH.size,
        totalCurrentLabelEntries: [...TARGET_REGION_LABELS_BY_PATH.values()]
          .reduce((total, labels) => total + labels.length, 0),
        minimumCurrentLabelsPerRoute: Math.min(
          ...[...TARGET_REGION_LABELS_BY_PATH.values()].map(
            (labels) => labels.length,
          ),
        ),
        maximumCurrentLabelsPerRoute: Math.max(
          ...[...TARGET_REGION_LABELS_BY_PATH.values()].map(
            (labels) => labels.length,
          ),
        ),
        routeLabelListSha256: hash(
          [...TARGET_REGION_LABELS_BY_PATH]
            .map(([route, labels]) => `${route}\t${labels.join("\u001f")}`)
            .join("\n"),
        ),
        totalPreservedRelatedLabelEntries: [
          ...TARGET_PRESERVED_LABELS_BY_PATH.values(),
        ].reduce((total, labels) => total + labels.length, 0),
        minimumPreservedRelatedLabelsPerRoute: Math.min(
          ...[...TARGET_PRESERVED_LABELS_BY_PATH.values()].map(
            (labels) => labels.length,
          ),
        ),
        maximumPreservedRelatedLabelsPerRoute: Math.max(
          ...[...TARGET_PRESERVED_LABELS_BY_PATH.values()].map(
            (labels) => labels.length,
          ),
        ),
        preservedRelatedLabelListSha256: hash(
          [...TARGET_PRESERVED_LABELS_BY_PATH]
            .map(([route, labels]) => `${route}\t${labels.join("\u001f")}`)
            .join("\n"),
        ),
      },
    },
    nearDuplicateWordTrigramJaccard: internalNearDuplicateAudit,
    strongNormalizedFullDocumentExactCollisions:
      strongNormalizedFullDocumentCollisionAudit,
    rawExactCollisions: rawExactCollisionAudit,
    targetNormalizedFullPrimaryProseExactCollisions:
      targetNormalizedPrimaryProseCollisionAudit,
    regionalFactAttribution: regionalFactAudit.report,
    regionalFactProseUniqueness: regionalFactProseReuseAudit,
    allowedCommonSignatures: allowedCommonSignatureAudit,
    repeatedBlockCharacterShare: {
      enforcement:
        "diagnostic-only: exact and current-target-normalized all-primary-block shares do not change release status",
      denominator:
        "Original visible Korean/Latin/digit characters in every nonempty rendered primary block; a block is repeated only when its key occurs in more than one document.",
      diagnosticUnit:
        "Each independently rendered H1, hook, section heading, paragraph, and action remains a separate diagnostic block.",
      exact: exactRepeatedBlockAudit,
      targetNormalized: targetNormalizedRepeatedBlockAudit,
      semanticSectionGroupingDiagnostic: {
        enforcement:
          "diagnostic-only; companion receipt for coherent-section reuse",
        unit:
          "Each semantic movement/directory section is joined as heading + two paragraphs + optional action, with the same original-character denominator and unchanged 0.25/0.35 thresholds.",
        assessment:
          "Section grouping is useful for detecting verbatim reuse of a coherent section, but one differing related-region fragment can make an otherwise repeated section unique and hide repeated common paragraphs. It is therefore reported alongside the individual-block diagnostic, while regional-fact prose receives the separate hard uniqueness audit.",
        exact: semanticSectionExactRepeatedBlockDiagnostic,
        targetNormalized: semanticSectionTargetRepeatedBlockDiagnostic,
      },
    },
    commonFullPriceAndFaqBlocks: commonFullRegionBlockSourceAudit,
    renderedBannedVisibleCopy: renderedBannedVisibleCopyAudit,
    contentSourceCustomerCopySelection: contentSourceSelectionAudit,
    dynamicKoreanParticleAgreement: dynamicKoreanParticleAudit,
    repositoryRootPortability: {
      documentsRootStrategy: "os.homedir() + Documents",
      sourceContainsPlatformSpecificHomePrefix:
        auditScriptSource.includes(platformSpecificHomePrefix),
      pass: repositoryRootsArePortable,
    },
  },
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
  report.currentRegionSentencePrefixes.pass &&
  report.descriptionLengths.pass &&
  report.uniqueNormalizedFullSignatures === 1291 &&
  report.normalizedTitleForms >= 11 &&
  report.uniquePrimaryKeywords === 1291 &&
  report.titlesStartingWithPrimary === 1291 &&
  report.titlesWithPrimaryExactlyOnce === 1291 &&
  report.h1WithPrimaryExactlyOnce === 1291 &&
  report.firstHundredWordsWithPrimary === 1291 &&
  report.serviceIntroductionsWithPrimary === 1291 &&
  report.routesWithExactlyTwoPrimaryH2s === 1291 &&
  report.renderedMainPrimaryMaxOccurrences === 5 &&
  report.routesWithPriceLinks === 1291 &&
  report.routesWithGuideLinks === 1291 &&
  report.minimumContextualRegionLinks >= 3 &&
  report.gallerySelfLinks === 0 &&
  report.commonFullRegionBlocksRemoved &&
  report.broadRouteSetSha256 ===
    "bc78efbc93abacd5dca4aea0e06897343d9858ea8d5efb85c1fd9733fe436771";
const collisionPass = Object.values(comparisons).every(
  (comparison) =>
    comparison.substantiveExactCollisions.count === 0 &&
    comparison.brandRegionNormalizedCollisions.count === 0,
);
const internalRenderedPrimaryContentPass =
  report.internalRenderedPrimaryContentAudit.scope.documentCount === 1291 &&
  report.internalRenderedPrimaryContentAudit.normalization
    .strongAllRelatedLabels.brandLabels.count === BRAND_LABELS.length &&
  report.internalRenderedPrimaryContentAudit.normalization
    .strongAllRelatedLabels.regionLabels.globalUniqueCount ===
    STRONG_REGION_LABELS.length &&
  report.internalRenderedPrimaryContentAudit.normalization.targetRepeatedBlocks
    .routeCount === 1291 &&
  report.internalRenderedPrimaryContentAudit.nearDuplicateWordTrigramJaccard
    .samplePairCount === 832695 &&
  report.internalRenderedPrimaryContentAudit.nearDuplicateWordTrigramJaccard
    .expectedPairCount === 832695 &&
  report.internalRenderedPrimaryContentAudit.nearDuplicateWordTrigramJaccard
    .allPairsEvaluated &&
  report.internalRenderedPrimaryContentAudit.rawExactCollisions.pass &&
  report.internalRenderedPrimaryContentAudit
    .targetNormalizedFullPrimaryProseExactCollisions.pass &&
  report.internalRenderedPrimaryContentAudit.regionalFactAttribution.pass &&
  report.internalRenderedPrimaryContentAudit.regionalFactProseUniqueness
    .pass &&
  report.internalRenderedPrimaryContentAudit.allowedCommonSignatures.pass &&
  report.internalRenderedPrimaryContentAudit.commonFullPriceAndFaqBlocks
    .pass &&
  report.internalRenderedPrimaryContentAudit.renderedBannedVisibleCopy.pass &&
  report.internalRenderedPrimaryContentAudit.contentSourceCustomerCopySelection
    .pass &&
  report.internalRenderedPrimaryContentAudit.dynamicKoreanParticleAgreement
    .pass &&
  report.internalRenderedPrimaryContentAudit.repositoryRootPortability.pass;
if (!shapePass || !collisionPass || !internalRenderedPrimaryContentPass) {
  report.status = "FAIL";
}

console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
