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
  getBreadcrumbs,
  getDirectChildren,
  getKeywordRegionLabel,
  getParentNode,
  getPrimaryRegionKeyword,
  getRegionHeadingLabel,
  getSearchRegionLabel,
  shortenRegionSearchName,
  usesConciseRegionHeading,
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

const FORBIDDEN_VISIBLE_TECHNICAL_COPY = [
  "정본",
  "원본 자료",
  "자료 분류",
  "행정 단계 수",
  "대표 분류",
  "관할 방식",
  "원본 행정",
  "profile",
  "seed",
  "hash",
  "ordinal",
  "slot",
  "signature",
  "trigram",
  "Jaccard",
  "목록의 첫",
  "목록의 마지막",
  "바로 앞 항목",
  "바로 다음 항목",
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
    getRegionHeadingLabel(node),
    getSearchRegionLabel(node),
    getKeywordRegionLabel(node),
    shortenRegionSearchName(node.qualifiedName),
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

function occurrenceCount(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

function visibleCharacterCount(value: string): number {
  return (value.match(/[가-힣A-Za-z0-9]/gu) ?? []).length;
}

function relatedRegionalFactTokens(
  node: (typeof ACTIVE_REGION_NODES)[number],
): string[] {
  const parent = getParentNode(node);
  const relatedNodes = [
    ...(parent ? [parent] : []),
    ...getDirectChildren(node)
      .map((child) =>
        ACTIVE_REGION_NODES.find((candidate) => candidate.path === child.path),
      )
      .filter((candidate): candidate is (typeof ACTIVE_REGION_NODES)[number] =>
        Boolean(candidate),
      ),
    ...(parent
      ? getDirectChildren(parent)
          .filter((sibling) => sibling.path !== node.path)
          .map((sibling) =>
            ACTIVE_REGION_NODES.find(
              (candidate) => candidate.path === sibling.path,
            ),
          )
          .filter(
            (candidate): candidate is (typeof ACTIVE_REGION_NODES)[number] =>
              Boolean(candidate),
          )
      : []),
  ];
  const currentLabels = new Set([
    node.qualifiedName,
    node.displayName,
    getRegionHeadingLabel(node),
    getSearchRegionLabel(node),
    getKeywordRegionLabel(node),
    getPrimaryRegionKeyword(node),
    shortenRegionSearchName(node.qualifiedName),
  ]);
  return [
    ...relatedNodes.flatMap((related) => [
      related.qualifiedName,
      related.displayName,
      getRegionHeadingLabel(related),
      getSearchRegionLabel(related),
      shortenRegionSearchName(related.qualifiedName),
    ]),
    ...(node.representative?.sourceNames ?? []),
    ...(node.representative?.legalAreas ?? []).map((area) => area.name),
  ].filter(
    (token, index, all) =>
      token.length >= 2 &&
      !currentLabels.has(token) &&
      all.indexOf(token) === index,
  );
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
      expect(content.sections.at(-1)?.id).toBe("regional-directory");
      expect(content.sections.every((item) => item.paragraphs.length === 2)).toBe(true);
    }
    for (const node of compact) {
      const content = createRegionContent(node);
      expect(content.detailMode).toBe("compact");
      expect(content.sections.map((item) => item.id)).toEqual(
        COMPACT_DETAIL_SECTION_IDS,
      );
      expect(content.sections).toHaveLength(10);
      expect(content.sections.at(-1)?.id).toBe("regional-directory");
      expect(content.sections.every((item) => item.paragraphs.length === 2)).toBe(true);
    }
  });

  it("keeps representative province, district and leaf pages on the same service contract", () => {
    const samples = [
      {
        label: "광역",
        path: "/areas/gyeonggi",
        detailMode: "broad",
        sectionCount: 11,
      },
      {
        label: "구",
        path: `/areas/seoul/${encodeURIComponent("강남구")}`,
        detailMode: "compact",
        sectionCount: 10,
      },
      {
        label: "말단",
        path: `/areas/seoul/${encodeURIComponent("강남구")}/${encodeURIComponent("역삼동")}`,
        detailMode: "compact",
        sectionCount: 10,
      },
    ] as const;

    for (const sample of samples) {
      const node = ACTIVE_REGION_NODES.find(
        (candidate) => candidate.path === sample.path,
      );
      expect(node, sample.label).toBeDefined();
      const content = createRegionContent(node!);
      const model = createRegionPageModel(node!);
      const primaryKeyword = getPrimaryRegionKeyword(node!);
      const firstOneHundredWords = [
        ...content.hooks,
        ...content.sections[0].paragraphs,
      ]
        .join(" ")
        .split(/\s+/u)
        .slice(0, 100)
        .join(" ");

      expect(content.detailMode, sample.label).toBe(sample.detailMode);
      expect(content.sections, sample.label).toHaveLength(sample.sectionCount);
      expect(content.title.startsWith(primaryKeyword), sample.label).toBe(true);
      expect(content.h1, sample.label).toContain(primaryKeyword);
      expect(firstOneHundredWords, sample.label).toContain(primaryKeyword);
      expect(
        content.sections.filter((section) =>
          section.heading.includes(primaryKeyword),
        ),
        sample.label,
      ).toHaveLength(2);
      expect(
        content.sections.find((section) => section.id === "course-price-link")
          ?.action?.path,
        sample.label,
      ).toBe("/pricing/");
      expect(
        content.sections.find((section) => section.id === "use-flow")?.action
          ?.path,
        sample.label,
      ).toBe("/guide/");
      expect(
        model.gallery.items.some((item) => item.path === node!.path),
        sample.label,
      ).toBe(false);
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
        REGION_KEYWORD_SUFFIXES.map((suffix, index) =>
          index === 0 ? getPrimaryRegionKeyword(node) : label + suffix,
        ),
      );
      expect(new Set(content.keywords).size).toBe(8);
    }
  });

  it("uses concise customer search names in all regional meta fields", () => {
    const expectedExamples = new Map([
      ["서울특별시", "서울"],
      ["인천광역시", "인천"],
      ["경기도", "경기"],
      ["제주특별자치도", "제주"],
      ["수원시", "수원"],
      ["천안시", "천안"],
    ]);
    for (const [official, concise] of expectedExamples) {
      expect(shortenRegionSearchName(official)).toBe(concise);
    }

    const forbiddenBeforeService =
      /(?:특별자치도|특별자치시|특별시|광역시|도|시)\s*(?=출장마사지|출장안마|타이마사지|아로마마사지|2인마사지)/u;

    const conciseDisplayFrequency = ACTIVE_REGION_NODES.reduce((counts, node) => {
      const concise = shortenRegionSearchName(node.displayName);
      counts.set(concise, (counts.get(concise) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());

    for (const { node, content } of records) {
      const searchLabel = getSearchRegionLabel(node);
      const keywordLabel = getKeywordRegionLabel(node);
      const metaSurface = [
        content.title,
        content.description,
        ...content.keywords,
      ].join("\n");

      const conciseDisplayName = shortenRegionSearchName(node.displayName);
      expect(searchLabel).toBe(
        (conciseDisplayFrequency.get(conciseDisplayName) ?? 0) > 1 &&
          usesConciseRegionHeading(node)
          ? getRegionHeadingLabel(node)
          : (conciseDisplayFrequency.get(conciseDisplayName) ?? 0) > 1 &&
              node.qualifiedName !== node.displayName
            ? shortenRegionSearchName(node.qualifiedName)
          : conciseDisplayName,
      );
      expect(content.title).toContain(searchLabel);
      expect(content.description).toContain(searchLabel);
      expect(content.keywords[0]).toBe(getPrimaryRegionKeyword(node));
      expect(
        content.keywords.slice(1).every((keyword) => keyword.startsWith(keywordLabel)),
      ).toBe(true);
      expect(metaSurface).not.toMatch(forbiddenBeforeService);
      expect(content.h1).toContain(getPrimaryRegionKeyword(node));
    }
  });

  it("places the exact spaced primary keyword on every required search surface", () => {
    const primaryKeywords = records.map(({ node }) =>
      getPrimaryRegionKeyword(node),
    );
    expect(new Set(primaryKeywords).size).toBe(1291);

    const addressCentricH1 =
      /(?:주소부터 시작|주소와 일정|행정 주소 단계|주소·코스·결제|상세 주소·일정|주소 확인 안내)/u;
    for (const { node, content } of records) {
      const primaryKeyword = getPrimaryRegionKeyword(node);
      const firstServiceSection = content.sections[0];
      const firstOneHundredWords = [
        ...content.hooks,
        ...firstServiceSection.paragraphs,
      ]
        .join(" ")
        .split(/\s+/u)
        .slice(0, 100)
        .join(" ");
      const h2Matches = content.sections.filter((item) =>
        item.heading.includes(primaryKeyword),
      );
      const renderedMainCopy = [
        content.h1,
        ...content.hooks,
        ...content.sections.flatMap((item) => [
          item.heading,
          ...item.paragraphs,
        ]),
      ].join("\n");

      expect(content.primaryKeyword).toBe(primaryKeyword);
      expect(content.title.startsWith(primaryKeyword), node.path).toBe(true);
      expect(occurrenceCount(content.title, primaryKeyword), node.path).toBe(1);
      expect(occurrenceCount(content.description, primaryKeyword), node.path).toBe(1);
      expect(occurrenceCount(content.h1, primaryKeyword), node.path).toBe(1);
      expect(content.h1, node.path).not.toMatch(addressCentricH1);
      expect(firstOneHundredWords, node.path).toContain(primaryKeyword);
      expect(firstServiceSection.id, node.path).toBe("service-introduction");
      expect(firstServiceSection.paragraphs.join(" "), node.path).toContain(
        primaryKeyword,
      );
      expect(firstServiceSection.paragraphs[0], node.path).toContain(
        "고객이 지정한 장소",
      );
      expect(firstServiceSection.paragraphs[0], node.path).toContain(
        "방문관리 서비스",
      );
      expect(h2Matches, node.path).toHaveLength(2);
      expect(occurrenceCount(renderedMainCopy, primaryKeyword), node.path).toBe(5);
    }
  });

  it("keeps 10–11 service-intent sections with canonical price and guide links", () => {
    const requiredIds = [
      "service-introduction",
      "consultation-preparation",
      "course-price-link",
      "pair-program",
      "onsite-payment",
      "supplies-sanitation",
      "use-flow",
      "regional-directory",
    ];
    for (const { node, content } of records) {
      const ids = content.sections.map((item) => item.id);
      expect(content.sections.length, node.path).toBeGreaterThanOrEqual(10);
      expect(content.sections.length, node.path).toBeLessThanOrEqual(12);
      for (const id of requiredIds) expect(ids, node.path).toContain(id);
      expect(ids.at(-1), node.path).toBe("regional-directory");

      const course = content.sections.find(
        (item) => item.id === "course-price-link",
      );
      const flow = content.sections.find((item) => item.id === "use-flow");
      expect(course?.action, node.path).toEqual({
        label: "5개 코스·14개 금액 전체 보기",
        path: "/pricing/",
      });
      expect(flow?.action, node.path).toEqual({
        label: "마사지데이 이용 순서 전체 보기",
        path: "/guide/",
      });
      const courseSummary = course?.paragraphs.join(" ") ?? "";
      for (const courseName of [
        "타이",
        "아로마",
        "힐링",
        "스페셜",
        "남성전용",
      ]) {
        expect(courseSummary, node.path).toContain(courseName);
      }
      expect(courseSummary, node.path).toContain("5개");
      expect(courseSummary, node.path).toContain("14개");
      expect(courseSummary, node.path).not.toMatch(/80,000원|90,000원|120,000원/u);
    }
  });

  it("provides parent, child or sibling region links without self-links", () => {
    const activePaths = new Set(ACTIVE_REGION_NODES.map((node) => node.path));
    for (const { node } of records) {
      const model = createRegionPageModel(node);
      const children = getDirectChildren(node);
      const parent = getParentNode(node);
      const itemPaths = model.gallery.items.map((item) => item.path);

      expect(new Set(itemPaths).size, node.path).toBe(itemPaths.length);
      expect(itemPaths, node.path).not.toContain(node.path);
      expect(itemPaths.every((item) => activePaths.has(item)), node.path).toBe(true);
      if (children.length > 0) {
        expect(new Set(itemPaths), node.path).toEqual(
          new Set(children.map((child) => child.path)),
        );
      } else if (itemPaths.length > 0) {
        const siblingPaths = new Set(
          parent
            ? getDirectChildren(parent)
                .filter((candidate) => candidate.path !== node.path)
                .map((candidate) => candidate.path)
            : [],
        );
        expect(itemPaths.every((item) => siblingPaths.has(item)), node.path).toBe(
          true,
        );
        const displayedNames = model.gallery.items
          .map((item) => item.name)
          .join("·");
        const directoryCopy = model.content.sections
          .at(-1)
          ?.paragraphs.join(" ");
        if (directoryCopy?.includes("화면에 표시되는 관련 지역 링크")) {
          expect(directoryCopy, node.path).toContain(
            `화면에 표시되는 관련 지역 링크는 ${displayedNames}입니다.`,
          );
        }
      }

      const contextualDestinations = new Set(
        [
          ...getBreadcrumbs(node).map((crumb) => crumb.path),
          ...itemPaths,
          model.gallery.guide.actionPath,
        ].filter((item) => item !== node.path),
      );
      expect(contextualDestinations.size, node.path).toBeGreaterThanOrEqual(3);
    }
  });

  it("does not render the common full price ledger or FAQ on every region", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/RegionExperience.tsx"),
      "utf8",
    );
    expect(source).not.toContain("COURSE_GROUPS");
    expect(source).not.toContain("SERVICE_FAQS");
    expect(source).not.toContain("courseGrid");
    expect(source).not.toContain("faqList");
    expect(source).toContain("movement.action");
    expect((source.match(/<h1\b/gu) ?? [])).toHaveLength(1);
  });

  it("uses concise names in every H1/H2 surface for all 41 root and city routes", () => {
    const conciseRoutes = records.filter(({ node }) =>
      usesConciseRegionHeading(node),
    );
    expect(conciseRoutes).toHaveLength(41);

    const examples = new Map([
      ["서울특별시", "서울"],
      ["인천광역시", "인천"],
      ["경기도", "경기"],
      ["수원시", "수원"],
      ["천안시", "천안"],
      ["아산시", "아산"],
      ["구미시", "구미"],
      ["부산광역시", "부산"],
      ["서귀포시", "서귀포"],
    ]);
    for (const [official, concise] of examples) {
      const node = ACTIVE_REGION_NODES.find(
        (candidate) => candidate.displayName === official,
      );
      expect(node, official).toBeDefined();
      expect(getRegionHeadingLabel(node!), official).toBe(concise);
    }

    const jejuRoot = ACTIVE_REGION_NODES.find(
      (candidate) => candidate.path === "/areas/jeju",
    );
    const jejuCity = ACTIVE_REGION_NODES.find(
      (candidate) => candidate.path === "/areas/jeju/%EC%A0%9C%EC%A3%BC%EC%8B%9C",
    );
    expect(jejuRoot).toBeDefined();
    expect(jejuCity).toBeDefined();
    expect(getSearchRegionLabel(jejuRoot!)).toBe("제주 전역");
    expect(getSearchRegionLabel(jejuCity!)).toBe("제주");

    const forbiddenAdministrativeToken =
      /(?:특별자치도|특별자치시|특별시|광역시)/u;
    for (const { node, content } of conciseRoutes) {
      const model = createRegionPageModel(node);
      const headingName = getRegionHeadingLabel(node);
      const headings = [
        content.h1,
        model.scene.heading,
        model.gallery.heading,
        ...content.sections.map((item) => item.heading),
      ];
      expect(content.h1.startsWith(headingName)).toBe(true);
      expect(model.scene.heading.startsWith(headingName)).toBe(true);
      expect(model.gallery.heading.startsWith(headingName)).toBe(true);
      expect(
        content.sections.filter((item) => item.heading.startsWith(headingName))
          .length,
      ).toBeGreaterThanOrEqual(4);
      expect(headings.join("\n")).not.toMatch(forbiddenAdministrativeToken);
      if (node.displayName !== headingName) {
        expect(headings.join("\n")).not.toContain(node.displayName);
      }
    }
  });

  it("keeps district and neighborhood leaf suffixes in heading labels", () => {
    for (const suffix of ["구", "동"] as const) {
      const node = ACTIVE_REGION_NODES.find(
        (candidate) =>
          !usesConciseRegionHeading(candidate) &&
          candidate.displayName.endsWith(suffix),
      );
      expect(node, suffix).toBeDefined();
      expect(getRegionHeadingLabel(node!)).toBe(node!.qualifiedName);
      expect(getRegionHeadingLabel(node!)).toContain(node!.displayName);
    }
  });

  it("removes long administrative names from every broad visible surface", () => {
    const broadNodes = ACTIVE_REGION_NODES.filter(usesConciseRegionHeading);
    const officialBroadNames = broadNodes
      .map((node) => node.displayName)
      .filter((name) => name !== shortenRegionSearchName(name));
    const hookValues = broadNodes.flatMap(
      (node) => createRegionContent(node).hooks,
    );
    const paragraphValues = broadNodes.flatMap((node) =>
      createRegionContent(node).sections.flatMap((item) => item.paragraphs),
    );
    const breadcrumbValues = broadNodes.flatMap((node) =>
      createRegionPageModel(node).breadcrumbs.slice(1).map((crumb) => crumb.name),
    );
    const cityChildPairs = broadNodes.flatMap((node) => {
      const sourceChildren = getDirectChildren(node);
      const renderedChildren = createRegionPageModel(node).gallery.items;
      return sourceChildren.flatMap((child, index) =>
        /시$/u.test(child.name)
          ? [{ source: child.name, rendered: renderedChildren[index].name }]
          : [],
      );
    });

    expect(hookValues).toHaveLength(82);
    expect(paragraphValues).toHaveLength(902);
    expect(breadcrumbValues).toHaveLength(71);
    expect(cityChildPairs).toHaveLength(30);
    for (const pair of cityChildPairs) {
      expect(pair.rendered).toBe(shortenRegionSearchName(pair.source));
    }

    const visible = broadNodes
      .flatMap((node) =>
        createRegionPageModel(node).renderedSurface.map((copy) => copy.value),
      )
      .join("\n");
    const broadMeta = broadNodes
      .map((node) => {
        const content = createRegionContent(node);
        return [content.title, content.description, ...content.keywords].join("\n");
      })
      .join("\n");
    expect(`${visible}\n${broadMeta}`).not.toContain("제주 제주");
    for (const officialName of officialBroadNames) {
      expect(`${visible}\n${broadMeta}`, officialName).not.toContain(officialName);
    }
  });

  it("keeps fact-led metadata and a natural shared H1 grammar", () => {
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
    expect(descriptionStats.unique).toBeGreaterThan(100);
    expect(descriptionStats.maximum).toBeLessThan(100);
    expect(
      Math.max(...records.map(({ content }) => content.description.length)),
    ).toBeLessThanOrEqual(180);
    expect(h1Stats.unique).toBe(1);
    expect(h1Stats.maximum).toBe(1291);
  });

  it("reuses common service facts without flooding prose with region-name prefixes", () => {
    const hooks = records.flatMap(({ content }) => content.hooks);
    const headings = records.flatMap(({ content }) =>
      content.sections.map((item) => item.heading),
    );
    const paragraphs = records.flatMap(({ content }) =>
      content.sections.flatMap((item) => item.paragraphs),
    );
    expect(hooks).toHaveLength(2582);
    expect(headings).toHaveLength(12951);
    expect(paragraphs).toHaveLength(25902);
    expect(new Set(hooks).size).toBeLessThan(hooks.length);
    expect(new Set(headings).size).toBeLessThan(headings.length);
    expect(new Set(paragraphs).size).toBeLessThan(paragraphs.length);
    for (const { node, content } of records) {
      const labels = [
        node.qualifiedName,
        usesConciseRegionHeading(node)
          ? shortenRegionSearchName(node.displayName)
          : node.displayName,
      ];
      const prose = [
        ...content.hooks,
        ...content.sections.flatMap((item) => item.paragraphs),
      ];
      const prefixed = prose.filter((value) =>
        labels.some((label) => value.startsWith(label)),
      ).length;
      expect(prefixed, node.path).toBeGreaterThanOrEqual(4);
      expect(prefixed, node.path).toBeLessThanOrEqual(8);
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

  it("keeps raw and current-target-neutral primary prose documents collision-free", () => {
    const rawDocuments = records.map(({ content }) =>
      [
        content.h1,
        ...content.hooks,
        ...content.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
          ...(section.action ? [section.action.label] : []),
        ]),
      ].join("\u001f"),
    );
    const targetNeutralDocuments = records.map(({ node }, index) =>
      normalizeRegionalCopy(rawDocuments[index], node),
    );
    expect(new Set(rawDocuments).size).toBe(1291);
    expect(new Set(targetNeutralDocuments).size).toBe(1291);
  });

  it("keeps three rendered locality facts and a unique target-neutral signature per route", () => {
    const signatures: string[] = [];
    let minimumFactShare = 1;
    for (const { node, content } of records) {
      const model = createRegionPageModel(node);
      const factualTokens = relatedRegionalFactTokens(node);
      const regionalParagraphs = content.sections
        .filter((section) =>
          [
            "regional-coverage",
            "local-service-scope",
            "regional-directory",
          ].includes(section.id),
        )
        .flatMap((section) => section.paragraphs);
      const factualParagraphs = regionalParagraphs.filter((paragraph) =>
        factualTokens.some((token) => paragraph.includes(token)),
      );

      expect(factualParagraphs.length, node.path).toBeGreaterThanOrEqual(3);
      expect(
        factualParagraphs.every((paragraph) =>
          model.renderedSurface.some((entry) => entry.value === paragraph),
        ),
        node.path,
      ).toBe(true);
      signatures.push(
        normalizeRegionalCopy(factualParagraphs.join("\u001f"), node),
      );

      const factualCharacters = factualParagraphs.reduce(
        (total, paragraph) => total + visibleCharacterCount(paragraph),
        0,
      );
      const primaryProseCharacters = [
        ...content.hooks,
        ...content.sections.flatMap((section) => section.paragraphs),
      ].reduce(
        (total, paragraph) => total + visibleCharacterCount(paragraph),
        0,
      );
      const share = factualCharacters / primaryProseCharacters;
      minimumFactShare = Math.min(minimumFactShare, share);
      expect(share, node.path).toBeGreaterThanOrEqual(0.25);
    }
    expect(new Set(signatures).size).toBe(1291);
    expect(minimumFactShare).toBeGreaterThanOrEqual(0.25);
  });

  it("keeps bodies focused while retaining each verified operating fact", () => {
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
      for (const paragraph of content.sections.flatMap((item) => item.paragraphs)) {
        expect(paragraph.length, node.path).toBeGreaterThanOrEqual(35);
        expect(paragraph.length, node.path).toBeLessThanOrEqual(260);
      }
    }
  });

  it("maps only the final directory section to the gallery guide", () => {
    for (const { node, content } of records) {
      const model = createRegionPageModel(node);
      expect(model.gallery.guide.section.id).toBe(content.sections.at(-1)?.id);
      expect(model.scene.index).toBe("SERVICE AREA");
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
      for (const phrase of FORBIDDEN_VISIBLE_TECHNICAL_COPY) {
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

  it("does not use ordinal, profile or seed selectors in regional copy", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/content.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/getRegionOrdinal|\bprofile\b|\bseed\b/u);
  });
});
