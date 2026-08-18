import manifestJson from "@/data/regional-image-assignments.template6.generated.json";
import type { RegionNode } from "@/lib/regions";

type ImageVariant = "desktop" | "tablet" | "mobile";

type RouteAssignment = {
  assetId: string;
  sourceClass: "reused" | "new";
  broad: boolean;
  sources: Record<ImageVariant, string>;
  provenance: string;
};

type AssignmentManifest = {
  schemaVersion: string;
  status: "PLANNED_AWAITING_GENERATION_AND_ROOT_REVIEW" | "ROOT_APPROVED_RELEASED";
  platformKey: string;
  distribution: {
    routes: number;
    assets: number;
    reusedRoutes: number;
    newRoutes: number;
    maxUses: number;
    parentChildCollisions: number;
    siblingCollisions: number;
  };
  routes: Record<string, RouteAssignment>;
};

const manifest = manifestJson as unknown as AssignmentManifest;

if (
  manifest.schemaVersion !== "massage-day-template6-regional-image-assignments/v1" ||
  manifest.platformKey !== "massage-day" ||
  !["PLANNED_AWAITING_GENERATION_AND_ROOT_REVIEW", "ROOT_APPROVED_RELEASED"].includes(manifest.status) ||
  manifest.distribution.routes !== 1291 ||
  manifest.distribution.assets !== 216 ||
  manifest.distribution.reusedRoutes !== 430 ||
  manifest.distribution.newRoutes !== 861 ||
  manifest.distribution.maxUses !== 6 ||
  manifest.distribution.parentChildCollisions !== 0 ||
  manifest.distribution.siblingCollisions !== 0 ||
  Object.keys(manifest.routes).length !== 1291
) {
  throw new Error("MASSAGE_DAY_REGION_IMAGE_MANIFEST_CONTRACT");
}

export const REGIONAL_IMAGE_ASSET_COUNT = 216;
export const REGIONAL_IMAGE_RELEASE_READY = manifest.status === "ROOT_APPROVED_RELEASED";

function assignmentFor(node: RegionNode): RouteAssignment {
  const assignment = manifest.routes[node.path];
  if (!assignment) throw new Error(`MASSAGE_DAY_REGION_IMAGE_NODE_MISSING:${node.path}`);
  return assignment;
}

export function getRegionalImageAssetNumber(node: RegionNode): number {
  const match = /^mday-t6-rgn-(\d{3})-v1$/u.exec(assignmentFor(node).assetId);
  if (!match) throw new Error(`MASSAGE_DAY_REGION_IMAGE_ASSET_ID:${node.path}`);
  return Number(match[1]);
}

export function getRegionalImageAssetId(node: RegionNode): string {
  return assignmentFor(node).assetId;
}

export function getRegionalImageAssetPath(
  node: RegionNode,
  variant: ImageVariant = "desktop",
): string {
  return assignmentFor(node).sources[variant];
}
