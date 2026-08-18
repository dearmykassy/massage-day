import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BROAD_DETAIL_SECTION_IDS,
  COMPACT_DETAIL_SECTION_IDS,
  createRegionContent,
  isBroadDetailRegion,
  REGION_KEYWORD_SUFFIXES,
} from "@/lib/content";
import { createRegionPageModel } from "@/lib/region-page-model";
import {
  ACTIVE_REGION_NODES,
  ACTIVE_ROOT_KEYS,
  getDirectChildren,
  getKeywordRegionLabel,
} from "@/lib/regions";

const FORBIDDEN_BRANDS = [
  "필링홈타이",
  "랑테라피",
  "마사지봄",
  "마사지러브",
  "콜미토닥이",
  "건마에반하다",
  "혼혈마사지",
  "GEONMAE BANHADA",
  "geonmae-banhada",
  "HONHYEOL",
  "honhyeol",
] as const;

const FORBIDDEN_COPY = [
  ...FORBIDDEN_BRANDS,
  "한눈에",
  "차분하게",
  "부담 없이",
  "맞춤",
  "여유롭게",
  "특별한",
  "섬세한",
  "나만의",
  "프리미엄",
  "최고",
  "완벽",
  "위치 지도",
  "지도 보기",
  "매장",
  "인기",
  "후기",
  "리뷰",
  "평점",
  "이용량",
  "배정",
  "출발",
  "도착",
  "이동 시간",
  "이동시간",
  "효능",
  "치료",
  "치유",
  "혈액순환",
  "통증 완화",
  "회복",
  "중요한 점은",
  "주목할 만한",
] as const;

const BROAD_ROUTE_SHA256 =
  "bc78efbc93abacd5dca4aea0e06897343d9858ea8d5efb85c1fd9733fe436771";

function normalizeRegionalCopy(
  value: string,
  node: (typeof ACTIVE_REGION_NODES)[number],
): string {
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
    .reduce((copy, label) => copy.replaceAll(label, "{지역}"), value)
    .replaceAll("마사지데이", "{브랜드}")
    .replace(/\s+/gu, " ")
    .trim();
}

function frequencies(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return {
    unique: counts.size,
    maximum: Math.max(...counts.values()),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/gu, "\\$&");
}

function hasFinalConsonant(value: string): boolean {
  const trimmed = value.trim();
  const codePoint = trimmed.codePointAt(trimmed.length - 1);
  return codePoint !== undefined &&
    codePoint >= 0xac00 &&
    codePoint <= 0xd7a3
    ? (codePoint - 0xac00) % 28 !== 0
    : false;
}

describe("canonical regional graph", () => {
  it("keeps the source snapshots and exact 1,291-route set", () => {
    const snapshots = [
      [
        "capital-regions.generated.json",
        "0242e5d86894321cba66b7f747675115520d856c7aaada870869e19f247500d2",
      ],
      [
        "service-city-regions.generated.json",
        "72a318974585509632ba229307a954d01c40adcb8d98ff4ba6fbd1f1655f0d3d",
      ],
    ] as const;
    for (const [fileName, expectedSha256] of snapshots) {
      const bytes = readFileSync(path.join(process.cwd(), "src/data", fileName));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        expectedSha256,
      );
    }
    const routeSet = ACTIVE_REGION_NODES.map((node) => node.path)
      .sort()
      .join("\n");
    expect(createHash("sha256").update(routeSet).digest("hex")).toBe(
      "8a80b8a8d68fd6e1f0db9e4c662c82d3dafd24b7a70a532fe8f71b0d16d8c29d",
    );
  });

  it("keeps 11 roots and the exact node-kind distribution", () => {
    expect(ACTIVE_ROOT_KEYS).toHaveLength(11);
    expect(ACTIVE_REGION_NODES).toHaveLength(1291);
    expect(new Set(ACTIVE_REGION_NODES.map((node) => node.path)).size).toBe(1291);
    expect(ACTIVE_REGION_NODES.filter((node) => node.kind === "root")).toHaveLength(11);
    expect(ACTIVE_REGION_NODES.filter((node) => node.kind === "hub")).toHaveLength(127);
    expect(
      ACTIVE_REGION_NODES.filter((node) => node.kind === "representative"),
    ).toHaveLength(1153);
    expect(
      ACTIVE_REGION_NODES.filter((node) => node.kind !== "representative").every(
        (node) => getDirectChildren(node).length > 0,
      ),
    ).toBe(true);
  });
});

describe("broad and compact detail contracts", () => {
  const broad = ACTIVE_REGION_NODES.filter(isBroadDetailRegion);
  const compact = ACTIVE_REGION_NODES.filter((node) => !isBroadDetailRegion(node));

  it("locks root || displayName /시$/ to the approved 41 routes", () => {
    for (const node of ACTIVE_REGION_NODES) {
      expect(isBroadDetailRegion(node)).toBe(
        node.kind === "root" || /시$/u.test(node.displayName),
      );
    }
    expect(broad).toHaveLength(41);
    expect(compact).toHaveLength(1250);
    expect(broad.filter((node) => node.kind === "root")).toHaveLength(11);
    expect(
      broad.filter((node) => node.kind !== "root" && /시$/u.test(node.displayName)),
    ).toHaveLength(30);
    const routeSet = broad.map((node) => node.path).sort().join("\n");
    expect(createHash("sha256").update(routeSet).digest("hex")).toBe(
      BROAD_ROUTE_SHA256,
    );
  });

  it("renders the exact ids, two paragraphs and directory-last ordering", () => {
    for (const node of broad) {
      const content = createRegionContent(node);
      expect(content.detailMode).toBe("broad");
      expect(content.sections.map((item) => item.id)).toEqual(
        BROAD_DETAIL_SECTION_IDS,
      );
      expect(content.sections).toHaveLength(11);
      expect(content.sections.at(-1)?.id).toBe("child-directory");
      expect(content.sections.every((item) => item.paragraphs.length === 2)).toBe(true);
    }
    for (const node of compact) {
      const content = createRegionContent(node);
      expect(content.detailMode).toBe("compact");
      expect(content.sections.map((item) => item.id)).toEqual(
        COMPACT_DETAIL_SECTION_IDS,
      );
      expect(content.sections).toHaveLength(10);
      expect(content.sections.at(-1)?.id).toBe("related-address-directory");
      expect(content.sections.every((item) => item.paragraphs.length === 2)).toBe(true);
    }
  });
});

describe("Massage Day regional copy", () => {
  const records = ACTIVE_REGION_NODES.map((node) => ({
    node,
    content: createRegionContent(node),
  }));

  it("emits unique raw metadata and keyword arrays for every route", () => {
    expect(new Set(records.map(({ content }) => content.title)).size).toBe(1291);
    expect(new Set(records.map(({ content }) => content.description)).size).toBe(1291);
    expect(new Set(records.map(({ content }) => content.h1)).size).toBe(1291);
    expect(
      new Set(records.map(({ content }) => JSON.stringify(content.keywords))).size,
    ).toBe(1291);
    for (const { node, content } of records) {
      const label = getKeywordRegionLabel(node);
      expect(content.keywords).toEqual(
        REGION_KEYWORD_SUFFIXES.map((suffix) => label + suffix),
      );
      expect(new Set(content.keywords).size).toBe(8);
    }
  });

  it("distributes normalized metadata without pick collapse", () => {
    const titleStats = frequencies(
      records.map(({ node, content }) =>
        normalizeRegionalCopy(content.title, node),
      ),
    );
    const descriptionStats = frequencies(
      records.map(({ node, content }) =>
        normalizeRegionalCopy(content.description, node),
      ),
    );
    const h1Stats = frequencies(
      records.map(({ node, content }) =>
        normalizeRegionalCopy(content.h1, node),
      ),
    );
    expect(titleStats.unique).toBeGreaterThanOrEqual(11);
    expect(titleStats.maximum).toBeLessThanOrEqual(80);
    expect(descriptionStats.unique).toBeGreaterThanOrEqual(900);
    expect(descriptionStats.maximum).toBeLessThanOrEqual(7);
    expect(h1Stats.unique).toBeGreaterThanOrEqual(11);
    expect(h1Stats.maximum).toBeLessThanOrEqual(70);
  });

  it("keeps every hook, heading and paragraph route-specific and raw-unique", () => {
    const hooks = records.flatMap(({ content }) => content.hooks);
    const headings = records.flatMap(({ content }) =>
      content.sections.map((item) => item.heading),
    );
    const paragraphs = records.flatMap(({ content }) =>
      content.sections.flatMap((item) => item.paragraphs),
    );
    expect(hooks).toHaveLength(2582);
    expect(new Set(hooks).size).toBe(hooks.length);
    expect(headings).toHaveLength(12951);
    expect(new Set(headings).size).toBe(headings.length);
    expect(paragraphs).toHaveLength(25902);
    expect(new Set(paragraphs).size).toBe(paragraphs.length);
    for (const { node, content } of records) {
      for (const paragraph of content.sections.flatMap((item) => item.paragraphs)) {
        expect(paragraph).toContain(node.displayName);
      }
    }
  });

  it("keeps normalized paragraph-slot reuse at five or fewer", () => {
    for (const [broadMode, sectionIds] of [
      [true, BROAD_DETAIL_SECTION_IDS],
      [false, COMPACT_DETAIL_SECTION_IDS],
    ] as const) {
      const selected = records.filter(
        ({ node }) => isBroadDetailRegion(node) === broadMode,
      );
      for (let sectionIndex = 0; sectionIndex < sectionIds.length; sectionIndex += 1) {
        for (let paragraphIndex = 0; paragraphIndex < 2; paragraphIndex += 1) {
          const stats = frequencies(
            selected.map(({ node, content }) =>
              normalizeRegionalCopy(
                content.sections[sectionIndex].paragraphs[paragraphIndex],
                node,
              ),
            ),
          );
          expect(stats.maximum).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it("keeps all 1,291 normalized full-page signatures distinct", () => {
    const signatures = records.map(({ node, content }) =>
      normalizeRegionalCopy(
        [
          content.description,
          ...content.hooks,
          ...content.sections.flatMap((item) => item.paragraphs),
        ].join("\u001f"),
        node,
      ),
    );
    expect(new Set(signatures).size).toBe(1291);
  });

  it("keeps compact bodies substantial and includes every operating fact", () => {
    for (const { node, content } of records) {
      const body = content.sections.flatMap((item) => item.paragraphs).join(" ");
      for (const fact of [
        "24시간",
        "5개",
        "14개",
        "2인",
        "현장",
        "현금",
        "카드",
        "일회용",
        "소독",
      ]) {
        expect(body).toContain(fact);
      }
      if (!isBroadDetailRegion(node)) {
        expect(body.length).toBeGreaterThanOrEqual(1200);
      }
    }
  });

  it("maps only the final directory section to the gallery guide", () => {
    for (const { node, content } of records) {
      const model = createRegionPageModel(node);
      expect(model.gallery.guide.section.id).toBe(content.sections.at(-1)?.id);
      expect(model.movements.map((item) => item.section.id)).toEqual(
        content.sections.slice(0, -1).map((item) => item.id),
      );
      expect(model.finalBeat.label).toBe("365일 24시간 전화상담");
      expect(model.semanticAdjacencyAudit.duplicateCount).toBe(0);
    }
  });

  it("rejects unsupported claims, hype and prior-platform brands", () => {
    for (const { node, content } of records) {
      const model = createRegionPageModel(node);
      const customerCopy = JSON.stringify({
        content,
        rendered: model.renderedSurface,
      });
      for (const phrase of FORBIDDEN_COPY) {
        expect(customerCopy).not.toContain(phrase);
      }
    }
  });

  it("does not attach the wrong Korean particle to a generated region name", () => {
    for (const { node, content } of records) {
      const visible = [
        content.title,
        content.description,
        content.h1,
        ...content.hooks,
        ...content.sections.flatMap((item) => [
          item.heading,
          ...item.paragraphs,
        ]),
      ].join("\n");
      const labels = [node.qualifiedName, node.displayName]
        .filter((label, index, all) => all.indexOf(label) === index)
        .sort((left, right) => right.length - left.length);
      for (const label of labels) {
        const allowed = hasFinalConsonant(label)
          ? new Set(["은", "이", "을", "과"])
          : new Set(["는", "가", "를", "와"]);
        const pattern = new RegExp(
          escapeRegExp(label) + "([은는이가을를과와])",
          "gu",
        );
        for (const match of visible.matchAll(pattern)) {
          expect(
            allowed.has(match[1]),
            node.path + ": " + match[0],
          ).toBe(true);
        }
      }
    }
  });

  it("keeps forbidden copy out of customer-facing source files", () => {
    const customerFiles = [
      "src/app/areas/page.tsx",
      "src/app/blog/page.tsx",
      "src/app/blog/[slug]/page.tsx",
      "src/app/guide/page.tsx",
      "src/app/layout.tsx",
      "src/app/notice/page.tsx",
      "src/app/page.tsx",
      "src/app/pricing/page.tsx",
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
    for (const fileName of customerFiles) {
      const source = readFileSync(path.join(process.cwd(), fileName), "utf8");
      for (const phrase of FORBIDDEN_COPY) {
        expect(source).not.toContain(phrase);
      }
    }
  });
});
