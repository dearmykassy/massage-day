import {
  getDirectChildren,
  getKeywordRegionLabel,
  getParentNode,
  getRegionOrdinal,
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
  "boundary-basis",
  "administrative-branch",
  "inquiry-note",
  "contact-hours",
  "course-ledger",
  "pair-booking",
  "onsite-settlement",
  "supplies-sanitizing",
  "first-call-sequence",
  "change-notice",
  "child-directory",
] as const;

export const COMPACT_DETAIL_SECTION_IDS = [
  "page-address-level",
  "destination-address-note",
  "homonym-check",
  "schedule-note",
  "course-row-check",
  "party-count-check",
  "settlement-method",
  "supply-care-standard",
  "call-recap",
  "related-address-directory",
] as const;

export type ContentSection = {
  id: string;
  heading: string;
  paragraphs: [string, string];
};

export type RegionContent = {
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
  return node.kind === "root" || /시$/u.test(node.displayName);
}

type NamePattern = (name: string) => string;
type DescriptionPattern = (name: string, geography: string) => string;

const TITLE_PATTERNS: readonly NamePattern[] = [
  (name) => `${name} 출장마사지 주소·코스 확인 | 마사지데이`,
  (name) => `${name} 24시간 전화상담 안내 | 마사지데이`,
  (name) => `${name} 코스·가격 행 확인 | 마사지데이`,
  (name) => `${name} 현장 후불 이용 안내 | 마사지데이`,
  (name) => `${name} 2인 프로그램 문의 안내 | 마사지데이`,
  (name) => `${name} 출장마사지 일정 메모 | 마사지데이`,
  (name) => `${name} 출장마사지 결제 확인 | 마사지데이`,
  (name) => `${name} 일회용 비품·소독 기준 | 마사지데이`,
  (name) => `${name} 주소 계층과 코스표 | 마사지데이`,
  (name) => `${name} 전화 문의 순서 | 마사지데이 출장마사지`,
  (name) => `${name} 출장마사지 인원·시간 확인 | 마사지데이`,
  (name) => `마사지데이 ${name} 출장마사지 지역 안내`,
  (name) => `${name} 5개 코스·14개 금액 | 마사지데이`,
  (name) => `${name} 출장마사지 변경 확인 | 마사지데이`,
  (name) => `${name} 받을 주소·일정 준비 | 마사지데이`,
  (name) => `${name} 현금·카드 현장 결제 | 마사지데이`,
  (name) => `${name} 출장마사지 전화 메모 | 마사지데이`,
] as const;

const H1_PATTERNS: readonly NamePattern[] = [
  (name) => `${name} 주소부터 시작하는 출장마사지 안내`,
  (name) => `${name} 전화 전에 준비할 주소와 일정`,
  (name) => `${name} 5개 코스·14개 가격 행 확인`,
  (name) => `${name} 출장마사지 현장 후불 안내`,
  (name) => `${name} 두 사람 이용 전화 준비`,
  (name) => `${name} 날짜·시각·인원 확인 순서`,
  (name) => `${name} 출장마사지 코스 메모`,
  (name) => `${name} 현금·카드 결제 확인`,
  (name) => `${name} 일회용 비품과 소독 기준`,
  (name) => `${name} 행정 주소 단계 확인`,
  (name) => `${name} 24시간 전화상담 준비`,
  (name) => `${name} 출장마사지 이용 항목 정리`,
  (name) => `${name} 주소·코스·결제 안내`,
  (name) => `${name} 출장마사지 변경 재확인`,
  (name) => `${name} 받을 장소와 이용 시간 메모`,
  (name) => `${name} 코스별 이용 시간 확인`,
  (name) => `${name} 출장마사지 전화 순서`,
  (name) => `${name} 2인 프로그램과 현장 정산`,
  (name) => `${name} 상세 주소·일정 확인 안내`,
] as const;

const DESCRIPTION_PATTERNS: readonly DescriptionPattern[] = [
  (name, geography) => `${geography} ${name} 페이지에서 받을 주소와 날짜·시각, 인원, 코스를 준비하고 24시간 전화상담으로 확인하는 순서를 안내합니다.`,
  (name, geography) => `${name} 출장마사지 안내입니다. ${geography} 5개 코스 14개 가격 행과 현장 후불 현금·카드 기준을 함께 확인할 수 있습니다.`,
  (name, geography) => `${geography} ${name} 전화 문의에 필요한 도로명·건물명, 일정, 이용 인원, 코스·시간과 현장 결제 항목을 정리했습니다.`,
  (name, geography) => `${name} 주소 계층을 확인하는 페이지입니다. ${geography} 24시간 전화상담, 2인 프로그램, 일회용 비품과 관리 전후 소독 기준을 안내합니다.`,
  (name, geography) => `${geography} ${name}에서 코스명과 이용 시간을 14개 가격 행에 맞추고 이용 뒤 현금 또는 카드로 정산하는 기준을 살펴보세요.`,
  (name, geography) => `${name} 문의 전 메모를 위한 안내입니다. ${geography} 주소, 날짜·시각, 인원, 다섯 코스와 현장 후불 방법을 차례로 확인합니다.`,
  (name, geography) => `${geography} ${name} 출장마사지의 주소 단계, 24시간 전화 창구, 2인 이용 항목, 일회용 비품과 소독 운영 기준을 담았습니다.`,
  (name, geography) => `${name} 지역 페이지에서 실제 받을 주소를 좁힙니다. ${geography} 코스·시간, 14개 금액, 현금·카드 현장 정산 항목도 확인하세요.`,
  (name, geography) => `${geography} ${name} 전화 전에 도로명과 건물명, 희망 일정, 인원, 코스 후보를 적고 변경 내용을 다시 알리는 방법을 안내합니다.`,
  (name, geography) => `${name} 출장마사지 확인 항목입니다. ${geography} 5개 코스와 14개 가격 행, 2인 프로그램, 선입금 없는 현장 후불을 설명합니다.`,
  (name, geography) => `${geography} ${name} 주소 안내와 함께 24시간 전화상담에 전달할 날짜·시각·인원·코스, 결제 방법을 정리했습니다.`,
  (name, geography) => `${name}에서 받을 장소를 전화로 확인하기 위한 페이지입니다. ${geography} 코스표, 2인 이용, 현장 현금·카드, 비품·소독 기준을 안내합니다.`,
  (name, geography) => `${geography} ${name} 행정 주소를 고른 뒤 상세 주소와 일정, 14개 가격 행, 현장 후불 방법을 전화에서 대조하는 순서를 확인하세요.`,
] as const;

function section(
  id: string,
  heading: string,
  first: string,
  second: string,
): ContentSection {
  return { id, heading, paragraphs: [first, second] };
}

function siblingContext(node: RegionNode): {
  parent: RegionNode | null;
  siblings: RegionChild[];
  index: number;
} {
  const parent = getParentNode(node);
  if (!parent) return { parent: null, siblings: [], index: 0 };
  const siblings = getDirectChildren(parent);
  const index = siblings.findIndex((candidate) => candidate.path === node.path);
  return { parent, siblings, index: Math.max(0, index) };
}

/**
 * Each paragraph starts with a truthful address relationship. Seven forms are
 * distributed by sibling position; the largest set is 31, so normalized reuse
 * stays at five or fewer per paragraph slot.
 */
function addressContext(node: RegionNode, slot: number): string {
  const children = getDirectChildren(node);
  const { parent, index } = siblingContext(node);
  if (!parent) {
    const anchors = children.slice(0, 3).map((child) => child.name).join("·");
    const variants = [
      `최상위 주소 ${node.displayName} 아래에는 직접 연결된 주소 항목 ${children.length}개가 있습니다${anchors ? `: ${anchors}` : ""}.`,
      `${node.displayName} 주소 안내는 ${children.length}개 바로 아래 단계로 나뉩니다${anchors ? `: ${anchors}` : ""}.`,
      `현재 주소 계층의 첫 단계는 ${node.displayName}, 다음 단계 수는 ${children.length}개입니다${anchors ? `: ${anchors}` : ""}.`,
      `${node.displayName} 페이지에서 확인하는 직계 주소 목록은 ${children.length}개입니다${anchors ? `: ${anchors}` : ""}.`,
      `주소 경로는 ${node.displayName} 단계에서 시작하고 ${children.length}개 하위 항목으로 이어집니다${anchors ? `: ${anchors}` : ""}.`,
      `${node.displayName} 최상위 항목에는 ${children.length}개 다음 주소가 연결됩니다${anchors ? `: ${anchors}` : ""}.`,
      `현재 선택한 최상위 주소: ${node.displayName}. 직계 하위 항목은 ${children.length}개입니다${anchors ? `: ${anchors}` : ""}.`,
    ];
    return variants[slot % variants.length];
  }

  const variants = [
    `상위 주소는 ${parent.qualifiedName}, 현재 단계는 ${node.displayName}입니다.`,
    `${node.displayName} 페이지는 ${parent.qualifiedName} 아래 주소 단계입니다.`,
    `주소 경로에서 ${parent.qualifiedName} 다음 단계가 ${node.displayName}입니다.`,
    `현재 주소 단계: ${parent.qualifiedName} → ${node.displayName}.`,
    `${parent.qualifiedName} 하위 목록에 ${node.displayName} 항목이 연결됩니다.`,
    `확인한 주소 계층은 ${parent.qualifiedName}, ${node.displayName} 순서입니다.`,
    `${node.displayName} 항목의 상위 주소는 ${parent.qualifiedName}입니다.`,
  ];
  return variants[(index + slot * 3) % variants.length];
}

function directBranchFact(node: RegionNode): string {
  const children = getDirectChildren(node);
  if (children.length === 0) {
    return `${node.qualifiedName} 다음에는 별도 지역 카드가 없으므로 도로명과 건물명을 전화로 확인합니다.`;
  }
  const names = children.slice(0, 5).map((child) => child.name).join("·");
  return `${node.qualifiedName} 직계 하위 주소는 ${children.length}개이며 ${names}${children.length > 5 ? " 외 항목" : ""}으로 이어집니다.`;
}

function relatedAddressFact(node: RegionNode): string {
  const children = getDirectChildren(node);
  if (children.length > 0) {
    const names = children.slice(0, 5).map((child) => child.name).join("·");
    return `${node.qualifiedName} 다음 주소 ${children.length}개 중 ${names}${children.length > 5 ? " 외 항목" : ""}을 목록에서 확인합니다.`;
  }

  const aliases = node.representative?.sourceNames ?? [];
  const additionalAliases = aliases.filter((name) => name !== node.displayName);
  if (additionalAliases.length > 0) {
    return `${node.qualifiedName} 페이지에는 ${additionalAliases.slice(0, 5).join("·")} 주소 명칭도 함께 연결됩니다.`;
  }

  const { parent, siblings, index } = siblingContext(node);
  if (!parent || siblings.length <= 1) {
    return `${node.qualifiedName} 뒤의 상세 위치는 도로명과 건물명으로 이어서 확인합니다.`;
  }
  const previous = siblings[(index - 1 + siblings.length) % siblings.length];
  const next = siblings[(index + 1) % siblings.length];
  return `같은 상위 주소 ${parent.qualifiedName}에서 ${previous.name}·${next.name} 항목도 ${node.displayName} 항목과 같은 단계에 놓입니다.`;
}

function homonymFact(node: RegionNode): string {
  const keywordLabel = getKeywordRegionLabel(node);
  if (keywordLabel !== node.displayName) {
    return `${node.displayName} 이름은 다른 상위 주소에도 있어 ${node.qualifiedName} 전체 계층으로 구분합니다.`;
  }
  const parent = getParentNode(node);
  return parent
    ? `${node.displayName} 주소는 상위 단계 ${parent.qualifiedName} 표기와 함께 읽어 경로를 구분합니다.`
    : `${node.displayName} 주소는 최상위 단계 이름과 바로 아래 항목을 함께 읽어 경로를 구분합니다.`;
}

function metadataGeographyFact(node: RegionNode): string {
  const children = getDirectChildren(node);
  if (children.length > 0) {
    const names = children.slice(0, 4).map((child) => child.name).join("·");
    return `직계 하위 주소 ${children.length}개 중 ${names}${children.length > 4 ? " 외 항목" : ""}이 연결됩니다.`;
  }

  const aliases = (node.representative?.sourceNames ?? []).filter(
    (name) => name !== node.displayName,
  );
  if (aliases.length > 0) {
    return `같은 페이지에서 확인하는 주소 명칭은 ${aliases.slice(0, 5).join("·")}입니다.`;
  }

  const { parent, siblings, index } = siblingContext(node);
  if (!parent || siblings.length <= 1) {
    return `현재 경로는 ${parent?.qualifiedName ?? node.displayName} 아래의 단일 주소 단계입니다.`;
  }
  const previous = siblings[(index - 1 + siblings.length) % siblings.length];
  const next = siblings[(index + 1) % siblings.length];
  return `상위 주소 ${parent.qualifiedName}의 같은 단계에는 ${previous.name}·${next.name} 항목도 있습니다.`;
}

function broadSections(node: RegionNode): ContentSection[] {
  const name = node.qualifiedName;
  return [
    section(
      "boundary-basis",
      `${name} 주소 경계 기준`,
      `${addressContext(node, 0)} 이 페이지는 실제 받을 주소를 좁히는 행정 계층 안내입니다.`,
      `${addressContext(node, 1)} 도로명과 건물명은 공개 화면에 남기지 않고 전화상담에서 전달합니다.`,
    ),
    section(
      "administrative-branch",
      `${name} 행정 주소 갈래`,
      `${addressContext(node, 2)} ${directBranchFact(node)}`,
      `${addressContext(node, 3)} 다음 주소 카드는 현재 받을 곳과 일치하는 계층을 고르는 데 사용합니다.`,
    ),
    section(
      "inquiry-note",
      `${name} 문의 메모 항목`,
      `${addressContext(node, 4)} 전화 전에는 도로명·건물명, 날짜, 희망 시각을 한 줄씩 적습니다.`,
      `${addressContext(node, 5)} 이용 인원과 코스명, 이용 시간도 주소 메모와 나누어 준비합니다.`,
    ),
    section(
      "contact-hours",
      `${name} 24시간 전화상담`,
      `${addressContext(node, 6)} 전화상담은 24시간 열려 있으며 준비한 주소와 일정으로 문의합니다.`,
      `${addressContext(node, 7)} 날짜와 희망 시각은 통화 시점의 일정과 함께 확인합니다.`,
    ),
    section(
      "course-ledger",
      `${name} 5개 코스·14개 가격 행`,
      `${addressContext(node, 8)} 가격표는 타이·아로마·힐링·스페셜·남성전용 5개 코스로 구분됩니다.`,
      `${addressContext(node, 9)} 일반 네 코스는 60·90·120분, 남성전용은 60·90분으로 모두 14개 가격 행입니다.`,
    ),
    section(
      "pair-booking",
      `${name} 두 사람 이용 확인`,
      `${addressContext(node, 10)} 두 사람이 한 장소에서 이용하려면 2인 프로그램을 원한다고 처음부터 알립니다.`,
      `${addressContext(node, 11)} 두 사람의 코스명과 이용 시간이 다르면 사람별 항목으로 나누어 전화에서 확인합니다.`,
    ),
    section(
      "onsite-settlement",
      `${name} 현장 후불 정산`,
      `${addressContext(node, 12)} 별도 예약금이나 선입금 없이 이용을 마친 뒤 같은 장소에서 결제합니다.`,
      `${addressContext(node, 13)} 현장 정산은 현금 또는 무선 카드 단말기 가운데 선택할 수 있습니다.`,
    ),
    section(
      "supplies-sanitizing",
      `${name} 비품·소독 운영 기준`,
      `${addressContext(node, 14)} 이용 비품은 일회용 항목을 사용합니다.`,
      `${addressContext(node, 15)} 관리 전과 관리 후에는 각각 소독 절차를 적용합니다.`,
    ),
    section(
      "first-call-sequence",
      `${name} 첫 전화 확인 순서`,
      `${addressContext(node, 16)} 첫 통화에서는 주소, 날짜·시각, 인원, 코스·시간 순서로 전달합니다.`,
      `${addressContext(node, 17)} 코스와 가격 행을 대조한 뒤 현금 또는 카드 중 결제 방법도 함께 확인합니다.`,
    ),
    section(
      "change-notice",
      `${name} 변경 내용 다시 알리기`,
      `${addressContext(node, 18)} 주소나 날짜·시각이 바뀌면 기존 내용과 변경 내용을 구분해 전화로 다시 알립니다.`,
      `${addressContext(node, 19)} 인원, 코스, 이용 시간 또는 결제 방법이 달라진 경우에도 새 항목으로 재확인합니다.`,
    ),
    section(
      "child-directory",
      `${name} 하위 주소 디렉터리`,
      `${addressContext(node, 20)} ${relatedAddressFact(node)}`,
      `${addressContext(node, 21)} 디렉터리는 행정 주소를 고르는 마지막 섹션이며 실제 도로명과 건물명은 전화로 전달합니다.`,
    ),
  ];
}

function compactSections(node: RegionNode): ContentSection[] {
  const name = node.qualifiedName;
  return [
    section(
      "page-address-level",
      `${name} 페이지 주소 단계`,
      `${addressContext(node, 0)} 현재 페이지 이름과 상위 주소가 실제 받을 곳의 행정 계층과 맞는지 확인합니다.`,
      `${addressContext(node, 1)} 화면의 지역 선택은 주소 단계 확인용이며 도로명과 건물명은 전화에서 이어서 확인합니다.`,
    ),
    section(
      "destination-address-note",
      `${name} 받을 주소 메모`,
      `${addressContext(node, 2)} 전화 메모에는 도로명, 건물 번호, 건물명을 서로 다른 항목으로 적습니다.`,
      `${addressContext(node, 3)} 상세 출입 내용이 필요하면 공개 검색창이 아니라 전화상담에서 주소 다음에 전달합니다.`,
    ),
    section(
      "homonym-check",
      `${name} 같은 이름 주소 구분`,
      `${addressContext(node, 4)} ${homonymFact(node)}`,
      `${addressContext(node, 5)} 같은 건물명이나 지역명이 반복되면 상위 행정 주소와 도로명을 함께 대조합니다.`,
    ),
    section(
      "schedule-note",
      `${name} 날짜·시각 메모`,
      `${addressContext(node, 6)} 문의할 날짜와 희망 시작 시각, 선택한 이용 시간을 각각 적습니다.`,
      `${addressContext(node, 7)} 시작 시각은 준비한 상세 주소를 알린 뒤 24시간 전화상담에서 확인합니다.`,
    ),
    section(
      "course-row-check",
      `${name} 코스 가격 행 확인`,
      `${addressContext(node, 8)} 5개 코스인 타이·아로마·힐링·스페셜·남성전용에서 원하는 이름을 먼저 고릅니다.`,
      `${addressContext(node, 9)} 전체 14개 가격 행 가운데 코스명과 60·90·120분 이용 시간이 맞는 행을 대조합니다.`,
    ),
    section(
      "party-count-check",
      `${name} 이용 인원 확인`,
      `${addressContext(node, 10)} 한 명인지 두 명인지 인원을 주소와 일정 뒤에 전달합니다.`,
      `${addressContext(node, 11)} 2인 프로그램은 두 사람의 코스와 이용 시간을 사람별로 나누어 전화에서 확인합니다.`,
    ),
    section(
      "settlement-method",
      `${name} 결제 방법 확인`,
      `${addressContext(node, 12)} 예약금이나 선입금을 보내지 않고 이용을 마친 현장에서 후불로 정산합니다.`,
      `${addressContext(node, 13)} 현금과 무선 카드 단말기 중 사용할 현장 결제 방법을 통화에서 확인합니다.`,
    ),
    section(
      "supply-care-standard",
      `${name} 일회용 비품·소독 기준`,
      `${addressContext(node, 14)} 준비되는 비품은 일회용 항목을 기준으로 합니다.`,
      `${addressContext(node, 15)} 소독은 관리 전과 관리 후 두 시점에 적용합니다.`,
    ),
    section(
      "call-recap",
      `${name} 전화 내용 되짚기`,
      `${addressContext(node, 16)} 통화를 마치기 전 주소, 날짜·시각, 인원, 코스명·시간을 순서대로 다시 읽습니다.`,
      `${addressContext(node, 17)} 주소나 일정, 인원, 코스, 결제 방법이 바뀌면 달라진 항목을 전화로 재확인합니다.`,
    ),
    section(
      "related-address-directory",
      `${name} 관련 주소 디렉터리`,
      `${addressContext(node, 18)} ${relatedAddressFact(node)}`,
      `${addressContext(node, 19)} 관련 주소 목록은 이 페이지의 마지막 콘텐츠이며 실제 받을 곳은 도로명과 건물명으로 확인합니다.`,
    ),
  ];
}

export function createRegionContent(node: RegionNode): RegionContent {
  const ordinal = getRegionOrdinal(node);
  const keywordLabel = getKeywordRegionLabel(node);
  const name = node.qualifiedName;
  const broad = isBroadDetailRegion(node);
  const geography = metadataGeographyFact(node);

  return {
    title: TITLE_PATTERNS[(ordinal * 7 + 3) % TITLE_PATTERNS.length](name),
    description: DESCRIPTION_PATTERNS[
      (ordinal * 5 + 2) % DESCRIPTION_PATTERNS.length
    ](name, geography),
    keywords: REGION_KEYWORD_SUFFIXES.map((suffix) => `${keywordLabel}${suffix}`),
    h1: H1_PATTERNS[(ordinal * 11 + 5) % H1_PATTERNS.length](name),
    eyebrow: "마사지데이 · 주소 확인",
    hooks: [
      `${addressContext(node, 30)} 받을 도로명과 건물명, 날짜·시각, 인원, 코스를 전화 전에 준비합니다.`,
      `${addressContext(node, 31)} 24시간 전화상담에서 일정과 14개 가격 행, 현장 후불 방법을 차례로 확인합니다.`,
    ],
    sections: broad ? broadSections(node) : compactSections(node),
    ctaLabels: ["전화로 일정 확인", "5개 코스·14개 금액", "관련 주소 보기"],
    detailMode: broad ? "broad" : "compact",
  };
}
