import {
  getDirectChildren,
  getRegionHeadingLabel,
  getKeywordRegionLabel,
  getParentNode,
  getPrimaryRegionKeyword,
  getRelatedSiblingItems,
  shortenRegionSearchName,
  usesConciseRegionHeading,
  type RegionChild,
  type RegionNode,
} from "@/lib/regions";

export const REGION_KEYWORD_SUFFIXES = [
  "출장마사지",
  "출장안마",
  "마사지데이",
  "타이마사지",
  "아로마마사지",
  "2인마사지",
  "현장후불",
  "24시간전화상담",
] as const;

export const BROAD_DETAIL_SECTION_IDS = [
  "service-introduction",
  "regional-coverage",
  "consultation-preparation",
  "consultation-hours",
  "course-price-link",
  "pair-program",
  "onsite-payment",
  "supplies-sanitation",
  "use-flow",
  "change-confirmation",
  "regional-directory",
] as const;

export const COMPACT_DETAIL_SECTION_IDS = [
  "service-introduction",
  "local-service-scope",
  "consultation-preparation",
  "schedule-contact",
  "course-price-link",
  "pair-program",
  "onsite-payment",
  "supplies-sanitation",
  "use-flow",
  "regional-directory",
] as const;

export type ContentAction = {
  label: string;
  path: "/pricing/" | "/guide/";
};

export type ContentSection = {
  id: string;
  heading: string;
  paragraphs: [string, string];
  action?: ContentAction;
};

export type RegionContent = {
  primaryKeyword: string;
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  eyebrow: string;
  hooks: [string, string];
  sections: ContentSection[];
  ctaLabels: [string, string, string];
  detailMode: "broad" | "compact";
};

/** The owner-approved broad boundary resolves to exactly 41 active routes. */
export function isBroadDetailRegion(node: RegionNode): boolean {
  return usesConciseRegionHeading(node);
}


function section(
  id: string,
  heading: string,
  first: string,
  second: string,
  action?: ContentAction,
): ContentSection {
  return { id, heading, paragraphs: [first, second], ...(action ? { action } : {}) };
}

function withTopicParticle(value: string): string {
  const last = value.codePointAt(value.length - 1);
  const hasFinalConsonant =
    last !== undefined &&
    last >= 0xac00 &&
    last <= 0xd7a3 &&
    (last - 0xac00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? "은" : "는"}`;
}

function withAndParticle(value: string): string {
  const last = value.codePointAt(value.length - 1);
  const hasFinalConsonant =
    last !== undefined &&
    last >= 0xac00 &&
    last <= 0xd7a3 &&
    (last - 0xac00) % 28 !== 0;
  return `${value}${hasFinalConsonant ? "과" : "와"}`;
}

function siblingContext(node: RegionNode): {
  parent: RegionNode | null;
  siblings: RegionChild[];
} {
  const parent = getParentNode(node);
  if (!parent) return { parent: null, siblings: [] };
  const siblings = getDirectChildren(parent);
  return { parent, siblings };
}

function visibleDisplayName(pageNode: RegionNode, targetNode: RegionNode): string {
  return isBroadDetailRegion(pageNode)
    ? shortenRegionSearchName(targetNode.displayName)
    : targetNode.displayName;
}

function visibleQualifiedName(pageNode: RegionNode, targetNode: RegionNode): string {
  if (!isBroadDetailRegion(pageNode)) return targetNode.qualifiedName;
  if (pageNode.path === targetNode.path || targetNode.kind === "root") {
    return getRegionHeadingLabel(targetNode);
  }
  return shortenRegionSearchName(targetNode.qualifiedName);
}

function visibleChildName(pageNode: RegionNode, child: RegionChild): string {
  return isBroadDetailRegion(pageNode)
    ? shortenRegionSearchName(child.name)
    : child.name;
}

function hierarchyFact(node: RegionNode): string {
  const current = visibleQualifiedName(node, node);
  const parent = getParentNode(node);
  if (!parent) {
    const children = getDirectChildren(node);
    const names = children
      .slice(0, 3)
      .map((child) => visibleChildName(node, child))
      .join("·");
    return names
      ? `${current}에서는 ${names} 등 하위 지역 안내를 이어서 확인할 수 있습니다. 각 지역 링크에서는 해당 지역의 코스, 전화상담, 현장 후불 안내를 이어서 볼 수 있습니다.`
      : `${current}의 세부 도로명과 건물명은 전화상담에서 확인합니다.`;
  }
  return `${withTopicParticle(current)} ${visibleQualifiedName(node, parent)} 아래의 지역 경로로 안내하며, 상세 도로명과 건물명은 전화상담에서 이어서 확인합니다. 상위 지역 링크로 이동하면 더 넓은 범위의 지역 안내를 다시 확인할 수 있습니다.`;
}

function legalNameFact(node: RegionNode): string {
  const current = visibleQualifiedName(node, node);
  const aliases = (node.representative?.sourceNames ?? [])
    .filter((name) => name !== node.displayName)
    .slice(0, 4)
    .map((name) => isBroadDetailRegion(node) ? shortenRegionSearchName(name) : name);
  const legalNames = [
    ...new Set(
      (node.representative?.legalAreas ?? [])
        .map((area) => area.name)
        .filter((name) => name !== node.displayName),
    ),
  ]
    .slice(0, 4)
    .map((name) => isBroadDetailRegion(node) ? shortenRegionSearchName(name) : name);

  if (aliases.length > 0 && legalNames.length > 0) {
    return `${current} 경로에 연결된 행정동 명칭은 ${aliases.join("·")}, 법정동 명칭은 ${legalNames.join("·")}입니다. 주소가 이 명칭으로 표시되면 같은 지역 안내에서 확인하고 세부 도로명과 건물명은 전화로 전달합니다.`;
  }
  if (aliases.length > 0) {
    return `${current} 경로에 연결된 행정동 명칭은 ${aliases.join("·")}입니다. 주소가 이 명칭으로 표시되면 같은 지역 안내에서 확인하고 세부 도로명과 건물명은 전화로 전달합니다.`;
  }
  if (legalNames.length > 0) {
    return `${current} 경로에 연결된 법정동 명칭은 ${legalNames.join("·")}입니다. 주소가 이 명칭으로 표시되면 같은 지역 안내에서 확인하고 세부 도로명과 건물명은 전화로 전달합니다.`;
  }
  return "";
}

function directBranchFact(node: RegionNode): string {
  const children = getDirectChildren(node);
  const qualifiedName = visibleQualifiedName(node, node);
  if (children.length === 0) {
    return `${withTopicParticle(qualifiedName)} 별도 하위 지역 링크 없이 안내하며, 실제 받을 곳의 도로명과 건물명은 전화로 확인합니다.`;
  }
  const names = children
    .slice(0, 4)
    .map((child) => visibleChildName(node, child))
    .join("·");
  return `${qualifiedName}에서 ${names}${children.length > 4 ? " 등" : ""} 하위 지역을 이어서 고를 수 있고, 실제 받을 세부 장소는 전화로 확인합니다. 선택한 하위 지역 페이지에서는 코스·예약·결제 정보를 해당 경로로 확인합니다.`;
}

function relatedAddressFact(node: RegionNode): string {
  const children = getDirectChildren(node);
  const qualifiedName = visibleQualifiedName(node, node);
  if (children.length > 0) {
    const names = children
      .slice(0, 4)
      .map((child) => visibleChildName(node, child))
      .join("·");
    return `${qualifiedName}에서는 ${names}${children.length > 4 ? " 등" : ""} 하위 지역 안내를 함께 확인하고, 받을 곳에 맞는 경로를 고를 수 있습니다. 각 하위 지역 링크에서는 해당 지역의 코스·전화 예약·현장 후불 안내를 확인할 수 있습니다.`;
  }

  const aliases = node.representative?.sourceNames ?? [];
  const additionalAliases = aliases.filter((name) => name !== node.displayName);
  if (additionalAliases.length > 0) {
    return `${qualifiedName} 페이지에는 ${additionalAliases.slice(0, 5).join("·")} 주소 명칭도 함께 연결되며, 상세 도로명과 건물명은 전화로 확인합니다.`;
  }

  const parent = getParentNode(node);
  const related = getRelatedSiblingItems(node);
  if (!parent || related.length === 0) {
    return `${qualifiedName}의 상세 위치는 도로명과 건물명으로 이어서 확인합니다.`;
  }
  const linkedNames = related
    .map((item) => visibleChildName(node, item))
    .join("·");
  const undisplayedCount = Math.max(
    0,
    getDirectChildren(parent).length - 1 - related.length,
  );
  const otherRegions = undisplayedCount > 0
    ? ` 이 밖에도 같은 상위 지역의 별도 안내가 ${undisplayedCount}개 있습니다.`
    : "";
  return `${withAndParticle(visibleDisplayName(node, node))} 같은 ${visibleQualifiedName(node, parent)} 아래에서 화면에 표시되는 관련 지역 링크는 ${linkedNames}입니다.${otherRegions} 표시된 각 링크에서는 선택한 지역에 맞는 서비스 범위와 코스·전화 안내를 별도로 확인할 수 있습니다.`;
}

function directoryRoutingFact(node: RegionNode): string {
  const current = visibleQualifiedName(node, node);
  const parent = getParentNode(node);
  if (parent) {
    return `${withTopicParticle(current)} ${visibleQualifiedName(node, parent)} 아래 지역으로 연결됩니다. 상위·관련 지역 링크에서 받을 곳을 고른 뒤 세부 도로명과 건물명은 전화로 전달합니다.`;
  }
  const childNames = getDirectChildren(node)
    .slice(0, 4)
    .map((child) => visibleChildName(node, child))
    .join("·");
  return `${current}에서는 ${childNames} 등 하위 지역 링크를 함께 확인할 수 있습니다. 받을 곳을 고른 뒤 세부 도로명과 건물명은 전화로 전달합니다.`;
}

function metadataGeographyFact(node: RegionNode): string {
  const children = getDirectChildren(node);
  if (children.length > 0) {
    const names = children
      .slice(0, 4)
      .map((child) => shortenRegionSearchName(child.name))
      .join("·");
    return `${names}${children.length > 4 ? " 등" : ""} 하위 지역 안내를 함께 확인할 수 있습니다.`;
  }

  const aliases = (node.representative?.sourceNames ?? []).filter(
    (name) => name !== node.displayName,
  );
  if (aliases.length > 0) {
    return `같은 페이지에서 확인하는 주소 명칭은 ${aliases
      .slice(0, 5)
      .map(shortenRegionSearchName)
      .join("·")}입니다.`;
  }

  const { parent, siblings } = siblingContext(node);
  if (!parent || siblings.length <= 1) {
    return `현재 경로는 ${shortenRegionSearchName(parent?.qualifiedName ?? node.displayName)} 아래의 단일 주소 단계입니다.`;
  }
  const related = siblings
    .filter((candidate) => candidate.path !== node.path);
  const relatedNames = related
    .slice(0, 4)
    .map((item) => shortenRegionSearchName(item.name))
    .join("·");
  return `${shortenRegionSearchName(parent.qualifiedName)} 아래의 ${relatedNames}${related.length > 4 ? " 등" : ""} 관련 지역도 함께 확인할 수 있습니다.`;
}

function metadataServiceFocus(node: RegionNode): string {
  const children = getDirectChildren(node);
  if (children.length > 0) {
    const names = children
      .slice(0, 2)
      .map((child) => shortenRegionSearchName(child.name))
      .join("·");
    return `${names} 하위 지역과 코스 연결`;
  }

  const aliases = (node.representative?.sourceNames ?? [])
    .filter((name) => name !== node.displayName)
    .slice(0, 2)
    .map(shortenRegionSearchName);
  if (aliases.length > 0) {
    return `${aliases.join("·")} 명칭과 코스 연결`;
  }

  const legalNames = [
    ...new Set(
      (node.representative?.legalAreas ?? [])
        .map((area) => area.name)
        .filter((name) => name !== node.displayName),
    ),
  ]
    .slice(0, 2)
    .map(shortenRegionSearchName);
  if (legalNames.length > 0) {
    return `${legalNames.join("·")} 법정동과 코스 연결`;
  }

  const parent = getParentNode(node);
  return `${shortenRegionSearchName(parent?.displayName ?? node.displayName)} 권역 코스·전화 안내`;
}

function broadSections(node: RegionNode): ContentSection[] {
  const name = getRegionHeadingLabel(node);
  const primaryKeyword = getPrimaryRegionKeyword(node);
  return [
    section(
      "service-introduction",
      `${primaryKeyword} 서비스 안내`,
      `${primaryKeyword}는 고객이 지정한 장소에서 선택한 코스와 이용 시간을 확인해 이용하는 방문관리 서비스입니다.`,
      "이 페이지에서는 코스·시간, 전화 예약 준비, 현장 후불 방법과 이용 흐름을 항목별로 확인할 수 있습니다.",
    ),
    section(
      "regional-coverage",
      `${name} 서비스 지역 범위`,
      directBranchFact(node),
      [
        legalNameFact(node) || hierarchyFact(node),
        `${name} 하위 지역 링크에서 받을 곳과 맞는 안내를 고른 뒤 전화로 상세 장소를 전합니다.`,
      ]
        .filter(Boolean)
        .join(" "),
    ),
    section(
      "consultation-preparation",
      "전화 예약 문의 전 준비",
      "전화 문의 전에는 도로명·건물명과 날짜, 희망 시각을 서로 구분해 적고 통화 전에 다시 확인합니다.",
      "이용 인원과 코스명, 이용 시간도 빠뜨리지 않도록 같은 메모에 나누어 준비한 뒤 전화상담에서 함께 알립니다.",
    ),
    section(
      "consultation-hours",
      "24시간 전화상담",
      "전화상담 창구는 24시간 운영하며 미리 준비한 장소와 희망 일정으로 문의할 수 있습니다.",
      "통화에서는 준비한 메모를 기준으로 주소, 날짜·시각, 인원, 코스·시간을 차례로 확인합니다.",
    ),
    section(
      "course-price-link",
      `${primaryKeyword} 코스·가격 확인`,
      "선택 가능한 코스는 타이·아로마·힐링·스페셜·남성전용 다섯 가지이며 원하는 코스명과 이용 시간을 함께 고릅니다.",
      "5개 코스의 14개 금액은 전용 가격 페이지에서 확인한 뒤 선택한 항목을 전화로 문의합니다.",
      { label: "5개 코스·14개 금액 전체 보기", path: "/pricing/" },
    ),
    section(
      "pair-program",
      "2인 프로그램 문의",
      "두 사람이 같은 장소를 이용할 때는 2인 프로그램 문의라고 전화에서 알립니다.",
      "두 사람의 코스명이나 이용 시간이 다르면 사람별 항목으로 나누어 확인합니다.",
    ),
    section(
      "onsite-payment",
      "이용 뒤 현장 후불",
      "이용은 예약금이나 선입금을 보내지 않고 마친 뒤 현장에서 후불로 정산합니다.",
      "현장 결제는 현금 또는 무선 카드 단말기 가운데 사용할 방법을 전화에서 확인합니다.",
    ),
    section(
      "supplies-sanitation",
      "비품·소독 운영 기준",
      "서비스 과정에 사용하는 비품은 일회용 항목을 기준으로 준비하고 각 이용 과정에서 사용합니다.",
      "소독 기준은 비품과 이용 공간을 확인하며 관리 전과 관리 후 두 시점에 각각 적용합니다.",
    ),
    section(
      "use-flow",
      "전화 문의부터 이용까지",
      "받을 곳을 정한 뒤 날짜·시각, 인원, 코스·시간을 준비해 전화상담으로 이어갑니다.",
      "통화에서 확인한 항목으로 이용한 뒤 이용을 마친 자리에서 현금 또는 카드로 현장 결제합니다.",
      { label: "마사지데이 이용 순서 전체 보기", path: "/guide/" },
    ),
    section(
      "change-confirmation",
      "변경 항목 전화 확인",
      "장소나 날짜·시각이 바뀌면 기존 내용과 변경 내용을 구분해 전화로 다시 알립니다.",
      "인원, 코스, 이용 시간 또는 결제 방법이 달라진 경우에도 바뀐 항목을 확인합니다.",
    ),
    section(
      "regional-directory",
      `${name} 하위·관련 지역 안내`,
      relatedAddressFact(node),
      directoryRoutingFact(node),
    ),
  ];
}

function compactSections(node: RegionNode): ContentSection[] {
  const name = node.qualifiedName;
  const primaryKeyword = getPrimaryRegionKeyword(node);
  return [
    section(
      "service-introduction",
      `${primaryKeyword} 서비스 안내`,
      `${primaryKeyword}는 고객이 지정한 장소에서 선택한 코스와 이용 시간을 확인해 이용하는 방문관리 서비스입니다.`,
      "이 페이지에서는 코스·시간, 전화 예약 준비, 현장 후불 방법과 이용 흐름을 항목별로 확인할 수 있습니다.",
    ),
    section(
      "local-service-scope",
      `${name} 지역 서비스 범위`,
      hierarchyFact(node),
      legalNameFact(node) || directBranchFact(node),
    ),
    section(
      "consultation-preparation",
      "전화 예약 문의 전 준비",
      "전화 메모에는 도로명·건물명, 날짜, 희망 시각을 나누어 적고 통화 전에 다시 확인합니다.",
      "이용 인원과 코스명, 이용 시간도 장소 정보와 구분해 준비한 뒤 전화상담에서 함께 알립니다.",
    ),
    section(
      "schedule-contact",
      "일정과 24시간 전화상담",
      "문의 날짜와 희망 시각을 정리하면 24시간 전화상담 창구에서 확인할 수 있습니다.",
      "통화에서는 장소, 날짜·시각, 인원, 코스·시간을 차례로 확인합니다.",
    ),
    section(
      "course-price-link",
      `${primaryKeyword} 코스·가격 확인`,
      "타이·아로마·힐링·스페셜·남성전용 5개 코스 가운데 원하는 이름과 이용 시간을 함께 고릅니다.",
      "14개 금액은 전용 가격 페이지에서 확인하고 고른 코스명과 시간을 전화로 문의합니다.",
      { label: "5개 코스·14개 금액 전체 보기", path: "/pricing/" },
    ),
    section(
      "pair-program",
      "2인 프로그램 확인",
      "문의할 때는 한 명 또는 두 명 가운데 이용 인원을 장소와 일정 뒤에 전달합니다.",
      "2인 프로그램은 두 사람의 코스와 이용 시간을 사람별로 나누어 전화에서 확인합니다.",
    ),
    section(
      "onsite-payment",
      "선입금 없는 현장 후불",
      "이용은 예약금이나 선입금을 보내지 않고 마친 장소에서 후불로 정산합니다.",
      "현금과 무선 카드 단말기 가운데 사용할 현장 결제 방법을 전화에서 확인합니다.",
    ),
    section(
      "supplies-sanitation",
      "일회용 비품·소독 기준",
      "서비스 과정에 사용하는 비품은 일회용 항목을 기준으로 준비하고 각 이용 과정에서 사용합니다.",
      "비품과 이용 공간에는 관리 전과 관리 후 각각 소독 기준을 적용합니다.",
    ),
    section(
      "use-flow",
      "전화 문의와 이용 흐름",
      "지역 페이지를 고른 뒤 장소·일정·인원·코스를 준비해 전화상담으로 이어갑니다.",
      "확인한 코스와 시간을 이용한 뒤 현금 또는 카드로 현장에서 결제합니다.",
      { label: "마사지데이 이용 순서 전체 보기", path: "/guide/" },
    ),
    section(
      "regional-directory",
      `${name} 상위·관련 지역 안내`,
      relatedAddressFact(node),
      directoryRoutingFact(node),
    ),
  ];
}

export function createRegionContent(node: RegionNode): RegionContent {
  const keywordLabel = getKeywordRegionLabel(node);
  const primaryKeyword = getPrimaryRegionKeyword(node);
  const broad = isBroadDetailRegion(node);
  const geography = metadataGeographyFact(node);
  const serviceFocus = metadataServiceFocus(node);

  return {
    primaryKeyword,
    title: `${primaryKeyword} | 방문관리 코스·전화 예약 안내 · ${serviceFocus} | 마사지데이`,
    description: `${primaryKeyword} 방문관리의 5개 코스·14개 가격, 24시간 전화상담, 현장 후불과 이용 흐름을 안내합니다. ${geography}`,
    keywords: REGION_KEYWORD_SUFFIXES.map((suffix, index) =>
      index === 0 ? primaryKeyword : `${keywordLabel}${suffix}`,
    ),
    h1: `${primaryKeyword} 방문관리 서비스 안내`,
    eyebrow: "마사지데이 · 지역 서비스",
    hooks: [
      `${primaryKeyword} 문의는 받을 장소와 날짜·시각, 인원, 코스를 준비하는 데서 시작합니다.`,
      "이 안내에서는 24시간 전화상담으로 일정과 코스, 선입금 없는 현장 후불 방법을 확인합니다.",
    ],
    sections: broad ? broadSections(node) : compactSections(node),
    ctaLabels: ["전화로 예약 항목 문의", "5개 코스·가격 보기", "상위·관련 지역 보기"],
    detailMode: broad ? "broad" : "compact",
  };
}
