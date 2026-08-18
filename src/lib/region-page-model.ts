import { PHONE_DISPLAY } from "@/lib/business";
import {
  createRegionContent,
  type ContentSection,
  type RegionContent,
} from "@/lib/content";
import type { RegionNode } from "@/lib/regions";
import {
  getBreadcrumbs,
  getDirectChildren,
  getParentNode,
  getRegionHeadingLabel,
  getRootNode,
  shortenRegionSearchName,
} from "@/lib/regions";

export type RegionRenderedCopyClassification =
  | "owned-copy"
  | "candidate-customer-guidance"
  | "verified-operating-fact"
  | "geography"
  | "navigation-fact"
  | "decorative";

export type RegionRenderedCopyEntry = {
  id: string;
  value: string;
  classification: RegionRenderedCopyClassification;
};

export type RegionPageModel = {
  route: string;
  content: RegionContent;
  breadcrumbs: Array<{ name: string; path: string; copyId: string }>;
  opening: {
    eyebrowCopyId: string;
    h1CopyId: string;
    hookCopyIds: [string, string];
    primaryActionCopyId: string;
    scoreActionCopyId: string;
  };
  scene: {
    index: string;
    name: string;
    heading: string;
    caption: string;
    indexCopyId: string;
    nameCopyId: string;
    headingCopyId: string;
    captionCopyId: string;
  };
  gallery: {
    index: string;
    heading: string;
    summary: string;
    terminal: string;
    indexCopyId: string;
    headingCopyId: string;
    summaryCopyId: string;
    terminalCopyId: string;
    items: Array<{
      path: string;
      number: string;
      name: string;
      countLabel: string;
      numberCopyId: string;
      nameCopyId: string;
      countCopyId: string;
    }>;
    guide: {
      section: ContentSection;
      headingCopyId: string;
      paragraphCopyIds: [string, string];
      actionLabel: string;
      actionPath: string;
      actionCopyId: string;
    };
  };
  movements: Array<{
    section: ContentSection;
    number: string;
    kicker: string;
    numberCopyId: string;
    kickerCopyId: string;
    headingCopyId: string;
    paragraphCopyIds: [string, string];
  }>;
  finalBeat: {
    label: string;
    heading: string;
    number: string;
    phone: string;
    labelCopyId: string;
    headingCopyId: string;
    numberCopyId: string;
    phoneCopyId: string;
  };
  semanticAdjacencyAudit: {
    headingPairsInspected: number;
    duplicateCount: number;
    violations: Array<{
      leftId: string;
      rightId: string;
      actionId: string;
      left: string;
      right: string;
    }>;
  };
  renderedSurface: RegionRenderedCopyEntry[];
};

function entry(
  id: string,
  value: string,
  classification: RegionRenderedCopyClassification,
): RegionRenderedCopyEntry {
  return { id, value, classification };
}

function headingActionIds(value: string): string[] {
  const actions = [
    {
      id: "address-detail-confirmation",
      pattern: /(?:서비스 주소|서비스를 받을 주소|도로명).*(?:확인|맞추기)/u,
    },
    {
      id: "region-selection",
      pattern: /(?:다음 지역|지역 찾기|지역 고르기)/u,
    },
    {
      id: "service-preparation-overview",
      pattern: /(?:이용 준비|서비스 준비).*(?:이어보기|살펴보기)/u,
    },
  ] as const;
  return actions.filter((action) => action.pattern.test(value)).map((action) => action.id);
}

/**
 * One deterministic model owns every visible string on a regional page.
 * Components render these values verbatim, while the corpus exports the same
 * id/value pairs so build QA can compare the two surfaces bidirectionally.
 */
export function createRegionPageModel(node: RegionNode): RegionPageModel {
  const content = createRegionContent(node);
  const directory = content.sections.at(-1);
  if (
    !directory ||
    !["child-directory", "related-address-directory"].includes(directory.id)
  ) {
    throw new Error(`MASSAGE_DAY_REGION_DIRECTORY_SECTION_MISSING:${node.path}`);
  }
  if (content.hooks.length !== 2 || content.ctaLabels.length !== 3) {
    throw new Error(`MASSAGE_DAY_REGION_COPY_SHAPE_INVALID:${node.path}`);
  }

  const children = getDirectChildren(node);
  const parent = getParentNode(node);
  const headingName = getRegionHeadingLabel(node);
  const rawBreadcrumbs = getBreadcrumbs(node);
  const breadcrumbs = rawBreadcrumbs.map((crumb, index) => ({
    ...crumb,
    name:
      content.detailMode === "broad" && index > 0
        ? index === rawBreadcrumbs.length - 1
          ? headingName
          : index === 1
            ? getRegionHeadingLabel(getRootNode(node.rootKey))
            : shortenRegionSearchName(crumb.name)
        : crumb.name,
    copyId: `breadcrumb:${index}`,
  }));
  const galleryItems = children.map((child, index) => ({
    path: child.path,
    number: String(index + 1).padStart(2, "0"),
    name:
      content.detailMode === "broad"
        ? shortenRegionSearchName(child.name)
        : child.name,
    countLabel: `${child.representativeCount}개 안내 지역`,
    numberCopyId: `gallery:item:${index}:number`,
    nameCopyId: `gallery:item:${index}:name`,
    countCopyId: `gallery:item:${index}:count`,
  }));
  const galleryHeading =
    children.length > 0
      ? `${headingName} 다음 주소 단계`
      : `${headingName} 상세 주소 전화 메모`;
  const gallerySummary =
    children.length > 0
      ? `연결된 지역 ${children.length}개`
      : "상세 주소는 통화에서 이어서 확인";
  const galleryTerminal = "도로명과 건물명은 지역 목록에 입력하지 않고 날짜·시각과 함께 전화로 전달합니다.";
  const sceneIndex = `ADDRESS LEVEL · ${node.segments.length
    .toString()
    .padStart(2, "0")}`;
  const sceneCaption = "주소 계층을 고른 뒤 날짜와 희망 시각을 메모합니다.";
  const sceneHeading = `${headingName} 이용 전 확인 항목`;
  const movements = content.sections.slice(0, -1).map((section, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      section,
      number,
      kicker: content.detailMode === "broad" ? `광역 안내 ${number}` : `확인 ${number}`,
      numberCopyId: `movement:${section.id}:number`,
      kickerCopyId: `movement:${section.id}:kicker`,
      headingCopyId: `movement:${section.id}:heading`,
      paragraphCopyIds: [
        `movement:${section.id}:paragraph:0`,
        `movement:${section.id}:paragraph:1`,
      ] as [string, string],
    };
  });
  const guide = {
    section: directory,
    headingCopyId: "directory:heading",
    paragraphCopyIds: [
      "directory:paragraph:0",
      "directory:paragraph:1",
    ] as [string, string],
    actionLabel: content.ctaLabels[2],
    actionPath: parent?.path ?? "/areas/",
    actionCopyId: "directory:action",
  };
  const headingPairs = [
    {
      leftId: "gallery:heading",
      rightId: guide.headingCopyId,
      left: galleryHeading,
      right: directory.heading,
    },
  ];
  const headingViolations = headingPairs.flatMap((pair) => {
    const rightActions = new Set(headingActionIds(pair.right));
    return headingActionIds(pair.left)
      .filter((actionId) => rightActions.has(actionId))
      .map((actionId) => ({ ...pair, actionId }));
  });
  if (headingViolations.length > 0) {
    throw new Error(
      `MASSAGE_DAY_REGION_ADJACENT_HEADING_SEMANTIC_DUPLICATE:${node.path}:${headingViolations[0].actionId}`,
    );
  }

  const renderedSurface: RegionRenderedCopyEntry[] = [
    ...breadcrumbs.map((crumb) => entry(crumb.copyId, crumb.name, "geography")),
    entry("opening:eyebrow", content.eyebrow, "owned-copy"),
    entry("opening:h1", content.h1, "owned-copy"),
    entry("opening:hook:0", content.hooks[0], "candidate-customer-guidance"),
    entry("opening:hook:1", content.hooks[1], "candidate-customer-guidance"),
    entry("opening:action:primary", content.ctaLabels[0], "owned-copy"),
    entry("opening:action:score", content.ctaLabels[1], "owned-copy"),
    entry("scene:index", sceneIndex, "decorative"),
    entry("scene:name", headingName, "geography"),
    entry("scene:heading", sceneHeading, "owned-copy"),
    entry("scene:caption", sceneCaption, "owned-copy"),
    entry("gallery:index", "ADDRESS DIRECTORY", "decorative"),
    entry("gallery:heading", galleryHeading, "navigation-fact"),
    entry("gallery:summary", gallerySummary, "navigation-fact"),
    ...galleryItems.flatMap((item) => [
      entry(item.numberCopyId, item.number, "decorative"),
      entry(item.nameCopyId, item.name, "geography"),
      entry(item.countCopyId, item.countLabel, "navigation-fact"),
    ]),
    ...(galleryItems.length === 0
      ? [entry("gallery:terminal", galleryTerminal, "candidate-customer-guidance")]
      : []),
    entry(guide.headingCopyId, directory.heading, "owned-copy"),
    entry(
      guide.paragraphCopyIds[0],
      directory.paragraphs[0],
      "candidate-customer-guidance",
    ),
    entry(
      guide.paragraphCopyIds[1],
      directory.paragraphs[1],
      "candidate-customer-guidance",
    ),
    entry(guide.actionCopyId, guide.actionLabel, "owned-copy"),
    ...movements.flatMap((movement) => [
      entry(movement.numberCopyId, movement.number, "decorative"),
      entry(movement.kickerCopyId, movement.kicker, "decorative"),
      entry(movement.headingCopyId, movement.section.heading, "owned-copy"),
      entry(
        movement.paragraphCopyIds[0],
        movement.section.paragraphs[0],
        "candidate-customer-guidance",
      ),
      entry(
        movement.paragraphCopyIds[1],
        movement.section.paragraphs[1],
        "candidate-customer-guidance",
      ),
    ]),
    entry("final:label", "365일 24시간 전화상담", "verified-operating-fact"),
    entry("final:heading", "주소·일정·인원·코스 메모를 통화에서 확인해 주세요", "owned-copy"),
    entry("final:number", PHONE_DISPLAY, "verified-operating-fact"),
    entry("final:phone", "전화상담", "owned-copy"),
  ];

  const ids = renderedSurface.map((copy) => copy.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`MASSAGE_DAY_REGION_RENDER_COPY_ID_DUPLICATE:${node.path}`);
  }

  return {
    route: node.path,
    content,
    breadcrumbs,
    opening: {
      eyebrowCopyId: "opening:eyebrow",
      h1CopyId: "opening:h1",
      hookCopyIds: ["opening:hook:0", "opening:hook:1"],
      primaryActionCopyId: "opening:action:primary",
      scoreActionCopyId: "opening:action:score",
    },
    scene: {
      index: sceneIndex,
      name: headingName,
      heading: sceneHeading,
      caption: sceneCaption,
      indexCopyId: "scene:index",
      nameCopyId: "scene:name",
      headingCopyId: "scene:heading",
      captionCopyId: "scene:caption",
    },
    gallery: {
      index: "ADDRESS DIRECTORY",
      heading: galleryHeading,
      summary: gallerySummary,
      terminal: galleryTerminal,
      indexCopyId: "gallery:index",
      headingCopyId: "gallery:heading",
      summaryCopyId: "gallery:summary",
      terminalCopyId: "gallery:terminal",
      items: galleryItems,
      guide,
    },
    movements,
    finalBeat: {
      label: "365일 24시간 전화상담",
      heading: "주소·일정·인원·코스 메모를 통화에서 확인해 주세요",
      number: PHONE_DISPLAY,
      phone: "전화상담",
      labelCopyId: "final:label",
      headingCopyId: "final:heading",
      numberCopyId: "final:number",
      phoneCopyId: "final:phone",
    },
    semanticAdjacencyAudit: {
      headingPairsInspected: headingPairs.length,
      duplicateCount: headingViolations.length,
      violations: headingViolations,
    },
    renderedSurface,
  };
}
