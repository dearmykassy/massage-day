import {
  ACTIVE_REGION_NODES,
  ROOT_LABELS,
  type RegionNode,
} from "@/lib/regions";

export type RegionSearchEntry = {
  id: string;
  path: string;
  displayName: string;
  qualifiedName: string;
  aliases: string[];
  order: number;
  normalizedDisplayName: string;
  normalizedQualifiedName: string;
  normalizedShortQualifiedName: string;
  normalizedAliases: string[];
  normalizedPath: string;
  normalizedPathSegments: string;
};

const COLLOQUIAL_ALIASES_BY_QUALIFIED_NAME: Readonly<Record<string, readonly string[]>> = {
  "서울특별시 마포구 서교동": ["홍대"],
  "서울특별시 광진구 화양동": ["건대"],
};

export function normalizeRegionSearchText(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s·.,/\\()[\]{}_-]+/g, "");
}

function tokenizeRegionSearchText(value: string): string[] {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("ko-KR")
    .split(/[\s·.,/\\()[\]{}_-]+/g)
    .map(normalizeRegionSearchText)
    .filter(Boolean);
}

function buildSearchEntry(node: RegionNode, order: number): RegionSearchEntry {
  const shortQualifiedName = [
    ROOT_LABELS[node.rootKey].short,
    ...node.segments.slice(1),
  ].join(" ");
  const decodedPath = decodeURIComponent(node.path);
  const pathSegments = [node.rootKey, ...node.segments.slice(1)].join(" ");
  const aliases = [
    ...new Set([
      ...node.aliases,
      ...(COLLOQUIAL_ALIASES_BY_QUALIFIED_NAME[node.qualifiedName] ?? []),
    ]),
  ];

  return {
    id: node.id,
    path: node.path,
    displayName: node.displayName,
    qualifiedName: node.qualifiedName,
    aliases,
    order,
    normalizedDisplayName: normalizeRegionSearchText(node.displayName),
    normalizedQualifiedName: normalizeRegionSearchText(node.qualifiedName),
    normalizedShortQualifiedName: normalizeRegionSearchText(shortQualifiedName),
    normalizedAliases: aliases.map(normalizeRegionSearchText),
    normalizedPath: normalizeRegionSearchText(decodedPath),
    normalizedPathSegments: normalizeRegionSearchText(pathSegments),
  };
}

/** A compact, stable client-side projection of the 1,291 active region routes. */
export const REGION_SEARCH_INDEX = ACTIVE_REGION_NODES.map(buildSearchEntry);

function scoreEntry(entry: RegionSearchEntry, query: string, queryTokens: string[]): number {
  if (entry.normalizedDisplayName === query) return 10_000;
  if (
    entry.normalizedQualifiedName === query ||
    entry.normalizedShortQualifiedName === query
  ) {
    return 9_900;
  }
  if (entry.normalizedAliases.includes(query)) return 9_800;
  if (
    entry.normalizedPath === query ||
    entry.normalizedPathSegments === query
  ) {
    return 9_700;
  }
  if (entry.normalizedDisplayName.startsWith(query)) return 9_000;
  if (
    entry.normalizedQualifiedName.startsWith(query) ||
    entry.normalizedShortQualifiedName.startsWith(query)
  ) {
    return 8_700;
  }
  if (entry.normalizedAliases.some((alias) => alias.startsWith(query))) return 8_500;
  if (entry.normalizedPathSegments.startsWith(query)) return 8_300;
  if (
    queryTokens.length > 1 &&
    queryTokens.every((token) =>
      [
        entry.normalizedQualifiedName,
        entry.normalizedShortQualifiedName,
        entry.normalizedPathSegments,
        ...entry.normalizedAliases,
      ].some((field) => field.includes(token)),
    )
  ) {
    return 8_200 + Math.min(queryTokens.length, 9);
  }
  if (entry.normalizedDisplayName.includes(query)) return 8_000;
  if (
    entry.normalizedQualifiedName.includes(query) ||
    entry.normalizedShortQualifiedName.includes(query)
  ) {
    return 7_700;
  }
  if (entry.normalizedAliases.some((alias) => alias.includes(query))) return 7_500;
  if (
    entry.normalizedPath.includes(query) ||
    entry.normalizedPathSegments.includes(query)
  ) {
    return 7_300;
  }
  return 0;
}

export function searchActiveRegions(queryInput: string, limit = 6): RegionSearchEntry[] {
  const query = normalizeRegionSearchText(queryInput);
  if (!query || limit <= 0) return [];
  const queryTokens = tokenizeRegionSearchText(queryInput);

  return REGION_SEARCH_INDEX.map((entry) => ({
    entry,
    score: scoreEntry(entry, query, queryTokens),
  }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.entry.order - right.entry.order ||
        left.entry.path.localeCompare(right.entry.path, "ko"),
    )
    .slice(0, limit)
    .map((candidate) => candidate.entry);
}

export function findBestActiveRegion(queryInput: string): RegionSearchEntry | null {
  return searchActiveRegions(queryInput, 1)[0] ?? null;
}
