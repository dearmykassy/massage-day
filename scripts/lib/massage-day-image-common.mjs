import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const PROJECT_ROOT = path.resolve(import.meta.dirname, "../..");
export const CAMPAIGN_KEY = "massage-day-template6-mirror-selfie-v1";
export const CAMPAIGN_ROOT = `artifacts/image-campaign/${CAMPAIGN_KEY}`;
export const CAMPAIGN_PATH = `${CAMPAIGN_ROOT}/campaign.v1.json`;
export const REUSE_PATH = `${CAMPAIGN_ROOT}/reused-assets.v1.json`;
export const REUSE_SUBSTITUTION_PATH = `${CAMPAIGN_ROOT}/reuse-substitutions/v2/selection.v2.json`;
export const INVENTORY_PATH = `${CAMPAIGN_ROOT}/contact-sheets/round-01/inventory.v1.json`;
export const CONTACT_SHEET_MANIFEST_PATH = `${CAMPAIGN_ROOT}/contact-sheets/round-01/contact-sheets.v1.json`;
export const GENERATED_RECEIPT_ROOT = `${CAMPAIGN_ROOT}/receipts/generated`;
export const REPLACEMENT_SELECTION_PATH = `${CAMPAIGN_ROOT}/replacements/v2/selection.v1.json`;
export const ROOT_REVIEW_INPUT_PATH = `${CAMPAIGN_ROOT}/reviews/root-review.input.v1.json`;
export const ROOT_REVIEW_RECEIPT_PATH = `${CAMPAIGN_ROOT}/reviews/root-review.receipt.v1.json`;
export const ASSIGNMENT_PATH = "src/data/regional-image-assignments.template6.generated.json";
export const FOCAL_PATH = "src/data/regional-image-focal-points.template6.json";
export const RELEASE_RECEIPT_PATH = "artifacts/image-release/massage-day-template6-regional-release.v1.json";
export const RELEASE_ROOT = "public/assets/massage-day/template6-regional";
export const MASTER_ROOT = "public/images/massage-day-template6/regional-masters";
export const EDITORIAL_MASTER_ROOT = "public/images/massage-day-template6/editorial-masters/generated";
export const HOME_REGION_ROOT = "public/images/massage-day-template6/home-regions";
export const BRAND_ROOT = "public/images/massage-day-template6/brand";

export const EXPECTED = Object.freeze({
  routes: 1291,
  broadRoutes: 41,
  compactRoutes: 1250,
  assets: 216,
  reusedAssets: 72,
  newAssets: 144,
  reusedRoutes: 430,
  newRoutes: 861,
  maxUses: 6,
  editorials: 3,
});

export const DERIVATIVE_PROFILES = Object.freeze({
  desktop: Object.freeze({ width: 1600, height: 900 }),
  tablet: Object.freeze({ width: 1200, height: 675 }),
  mobile: Object.freeze({ width: 768, height: 600 }),
});

export const ACTIVE_ROOT_KEYS = Object.freeze([
  "seoul",
  "incheon",
  "gyeonggi",
  "cheonan",
  "asan",
  "daejeon",
  "daegu",
  "gumi",
  "pohang",
  "busan",
  "jeju",
]);

const ROOT_NAMES = Object.freeze({
  seoul: "서울특별시",
  incheon: "인천광역시",
  gyeonggi: "경기도",
  cheonan: "천안시",
  asan: "아산시",
  daejeon: "대전광역시",
  daegu: "대구광역시",
  gumi: "구미시",
  pohang: "포항시",
  busan: "부산광역시",
  jeju: "제주특별자치도",
});

export function fail(scope, code) {
  throw new Error(`MASSAGE_DAY_${scope}_${code}`);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

export async function readJson(relativePath, scope = "IMAGE") {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  const bytes = await readFile(absolutePath).catch(() => fail(scope, `MISSING:${relativePath}`));
  try {
    return { bytes, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
  } catch {
    return fail(scope, `INVALID_JSON:${relativePath}`);
  }
}

export async function writeNewOrExact(relativePath, bytes, scope = "IMAGE") {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  try {
    await writeFile(absolutePath, bytes, { flag: "wx" });
    return "created";
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readFile(absolutePath);
    if (!existing.equals(bytes)) fail(scope, `NO_CLOBBER:${relativePath}`);
    return "exact";
  }
}

export async function writeReplace(relativePath, bytes) {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);
}

function encodedPath(segments) {
  return `/areas/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

function segmentKey(segments) {
  return segments.join("\u001f");
}

export async function buildRegionNodes() {
  const [capital, service] = await Promise.all([
    readJson("src/data/capital-regions.generated.json", "IMAGE_REGION"),
    readJson("src/data/service-city-regions.generated.json", "IMAGE_REGION"),
  ]);
  if (
    capital.value.schemaVersion !== 1 ||
    capital.value.status !== "COMMITTED" ||
    capital.value.regions?.length !== 768 ||
    service.value.schemaVersion !== 1 ||
    service.value.status !== "COMMITTED" ||
    service.value.regions?.length !== 385
  ) fail("IMAGE_REGION", "SOURCE_CONTRACT");

  const records = [...capital.value.regions, ...service.value.regions];
  const prefixRecords = new Map();
  for (const rootKey of ACTIVE_ROOT_KEYS) prefixRecords.set(segmentKey([rootKey]), []);
  for (const record of records) {
    for (let length = 1; length <= record.pathSegments.length; length += 1) {
      const segments = record.pathSegments.slice(0, length);
      const key = segmentKey(segments);
      const bucket = prefixRecords.get(key) ?? [];
      bucket.push(record);
      prefixRecords.set(key, bucket);
    }
  }

  const rootOrder = new Map(ACTIVE_ROOT_KEYS.map((root, index) => [root, index]));
  const nodes = [...prefixRecords.entries()].map(([key, nodeRecords]) => {
    const segments = key.split("\u001f");
    const representative = nodeRecords.find(
      (record) => record.pathSegments.length === segments.length,
    ) ?? null;
    const kind = segments.length === 1 ? "root" : representative ? "representative" : "hub";
    const displayName = kind === "root" ? ROOT_NAMES[segments[0]] : segments.at(-1);
    const nodePath = encodedPath(segments);
    return {
      rootKey: segments[0],
      segments,
      path: nodePath,
      parentPath: segments.length === 1 ? null : encodedPath(segments.slice(0, -1)),
      kind,
      displayName,
      broad: kind === "root" || /시$/u.test(displayName),
    };
  }).sort(
    (left, right) =>
      (rootOrder.get(left.rootKey) ?? 99) - (rootOrder.get(right.rootKey) ?? 99) ||
      left.segments.length - right.segments.length ||
      left.path.localeCompare(right.path, "ko"),
  );

  const broadCount = nodes.filter((node) => node.broad).length;
  if (nodes.length !== EXPECTED.routes || broadCount !== EXPECTED.broadRoutes) {
    fail("IMAGE_REGION", `NODE_COUNTS:${nodes.length}:${broadCount}`);
  }
  return nodes;
}

export function regionalAssetId(number) {
  return `mday-t6-rgn-${String(number).padStart(3, "0")}-v1`;
}

export function buildAssetDefinitions() {
  return Array.from({ length: EXPECTED.assets }, (_, index) => {
    const number = index + 1;
    const sourceClass = number <= EXPECTED.reusedAssets ? "reused" : "new";
    let routeUses = EXPECTED.maxUses;
    if (number === EXPECTED.reusedAssets) routeUses = 4;
    if (number === EXPECTED.assets) routeUses = 3;
    return {
      number,
      assetId: regionalAssetId(number),
      sourceClass,
      routeUses,
    };
  });
}

function stableNumber(value) {
  const digest = createHash("sha256").update(value).digest();
  return digest.readUInt32BE(0);
}

function tryAssignment(nodes, assets, seed) {
  const broadPaths = new Set(nodes.filter((node) => node.broad).map((node) => node.path));
  const compact = nodes.filter((node) => !node.broad);
  const reusedPaths = new Set(
    [...compact]
      .sort(
        (left, right) =>
          stableNumber(`class:${seed}:${left.path}`) - stableNumber(`class:${seed}:${right.path}`) ||
          left.path.localeCompare(right.path),
      )
      .slice(0, EXPECTED.reusedRoutes)
      .map((node) => node.path),
  );
  if ([...broadPaths].some((route) => reusedPaths.has(route))) return null;

  const remaining = new Map(assets.map((asset) => [asset.assetId, asset.routeUses]));
  const byClass = {
    reused: assets.filter((asset) => asset.sourceClass === "reused"),
    new: assets.filter((asset) => asset.sourceClass === "new"),
  };
  const routes = {};
  const siblingAssets = new Map();

  for (const node of nodes) {
    const sourceClass = reusedPaths.has(node.path) ? "reused" : "new";
    if (node.broad && sourceClass !== "new") return null;
    const parentAsset = node.parentPath ? routes[node.parentPath]?.assetId : null;
    const siblingKey = node.parentPath ?? `root:${node.rootKey}`;
    const usedBySiblings = siblingAssets.get(siblingKey) ?? new Set();
    const candidates = byClass[sourceClass]
      .filter(
        (asset) =>
          (remaining.get(asset.assetId) ?? 0) > 0 &&
          asset.assetId !== parentAsset &&
          !usedBySiblings.has(asset.assetId),
      )
      .sort(
        (left, right) =>
          (remaining.get(right.assetId) ?? 0) - (remaining.get(left.assetId) ?? 0) ||
          stableNumber(`asset:${seed}:${node.path}:${left.assetId}`) -
            stableNumber(`asset:${seed}:${node.path}:${right.assetId}`) ||
          left.assetId.localeCompare(right.assetId),
      );
    const chosen = candidates[0];
    if (!chosen) return null;
    routes[node.path] = {
      assetId: chosen.assetId,
      sourceClass,
      broad: node.broad,
      sources: Object.fromEntries(
        Object.keys(DERIVATIVE_PROFILES).map((profile) => [
          profile,
          `/assets/massage-day/template6-regional/${chosen.assetId}/${profile}.webp`,
        ]),
      ),
      provenance: `/assets/massage-day/template6-regional/${chosen.assetId}/provenance.json`,
    };
    remaining.set(chosen.assetId, (remaining.get(chosen.assetId) ?? 0) - 1);
    usedBySiblings.add(chosen.assetId);
    siblingAssets.set(siblingKey, usedBySiblings);
  }

  if ([...remaining.values()].some((value) => value !== 0)) return null;
  return routes;
}

export function verifyAssignment(nodes, assets, routes) {
  if (Object.keys(routes).length !== EXPECTED.routes) fail("IMAGE_ASSIGNMENT", "ROUTE_COUNT");
  const usage = new Map(assets.map((asset) => [asset.assetId, 0]));
  let reusedRoutes = 0;
  let newRoutes = 0;
  let broadRoutes = 0;
  let parentChildCollisions = 0;
  let siblingCollisions = 0;
  const childrenByParent = new Map();

  for (const node of nodes) {
    const route = routes[node.path];
    if (!route || !usage.has(route.assetId)) fail("IMAGE_ASSIGNMENT", `ROUTE:${node.path}`);
    usage.set(route.assetId, usage.get(route.assetId) + 1);
    if (route.sourceClass === "reused") reusedRoutes += 1;
    else if (route.sourceClass === "new") newRoutes += 1;
    else fail("IMAGE_ASSIGNMENT", `SOURCE_CLASS:${node.path}`);
    if (node.broad) {
      broadRoutes += 1;
      if (route.sourceClass !== "new") fail("IMAGE_ASSIGNMENT", `BROAD_REUSED:${node.path}`);
    }
    if (node.parentPath && routes[node.parentPath]?.assetId === route.assetId) {
      parentChildCollisions += 1;
    }
    const siblingKey = node.parentPath ?? `root:${node.rootKey}`;
    const siblingList = childrenByParent.get(siblingKey) ?? [];
    siblingList.push(route.assetId);
    childrenByParent.set(siblingKey, siblingList);
  }
  for (const values of childrenByParent.values()) {
    siblingCollisions += values.length - new Set(values).size;
  }
  for (const asset of assets) {
    if (usage.get(asset.assetId) !== asset.routeUses) {
      fail("IMAGE_ASSIGNMENT", `USAGE:${asset.assetId}:${usage.get(asset.assetId)}`);
    }
  }
  if (
    reusedRoutes !== EXPECTED.reusedRoutes ||
    newRoutes !== EXPECTED.newRoutes ||
    broadRoutes !== EXPECTED.broadRoutes ||
    parentChildCollisions !== 0 ||
    siblingCollisions !== 0
  ) {
    fail(
      "IMAGE_ASSIGNMENT",
      `DISTRIBUTION:${reusedRoutes}:${newRoutes}:${broadRoutes}:${parentChildCollisions}:${siblingCollisions}`,
    );
  }
  return { usage, reusedRoutes, newRoutes, broadRoutes, parentChildCollisions, siblingCollisions };
}

export function buildAssignments(nodes, assets) {
  for (let seed = 0; seed < 2048; seed += 1) {
    const routes = tryAssignment(nodes, assets, seed);
    if (!routes) continue;
    const audit = verifyAssignment(nodes, assets, routes);
    return { routes, seed, audit };
  }
  return fail("IMAGE_ASSIGNMENT", "NO_DETERMINISTIC_SOLUTION");
}

export function proposedFocalDocument(assets) {
  return {
    schemaVersion: "massage-day-template6-regional-focal-points/v1",
    status: "PROPOSED_AWAITING_ROOT_VISUAL_REVIEW",
    platformKey: "massage-day",
    coordinateUnit: "permille",
    reviewContract:
      "Coordinates are proposed only. Release requires a root review that binds this exact file hash and authorizes every responsive crop.",
    points: Object.fromEntries(
      assets.map((asset) => [
        asset.assetId,
        { xPermille: 500, yPermille: 500, reviewStatus: "PENDING_ROOT_REVIEW" },
      ]),
    ),
  };
}

export function plannedAssignmentDocument(nodes, assets, assignment, focalSha256) {
  return {
    schemaVersion: "massage-day-template6-regional-image-assignments/v1",
    status: "PLANNED_AWAITING_GENERATION_AND_ROOT_REVIEW",
    platformKey: "massage-day",
    assignmentSeed: assignment.seed,
    derivativeProfiles: DERIVATIVE_PROFILES,
    focalCropMetadata: { relativePath: FOCAL_PATH, sha256: focalSha256, status: "PROPOSED" },
    distribution: {
      routes: EXPECTED.routes,
      broadRoutes: EXPECTED.broadRoutes,
      compactRoutes: EXPECTED.compactRoutes,
      assets: EXPECTED.assets,
      reusedAssets: EXPECTED.reusedAssets,
      newAssets: EXPECTED.newAssets,
      reusedRoutes: assignment.audit.reusedRoutes,
      newRoutes: assignment.audit.newRoutes,
      maxUses: EXPECTED.maxUses,
      reusedUsage: { assetsAtSix: 71, assetsAtFour: 1 },
      newUsage: { assetsAtSix: 143, assetsAtThree: 1 },
      parentChildCollisions: assignment.audit.parentChildCollisions,
      siblingCollisions: assignment.audit.siblingCollisions,
    },
    assets: Object.fromEntries(
      assets.map((asset) => [
        asset.assetId,
        { sourceClass: asset.sourceClass, plannedRouteUses: asset.routeUses },
      ]),
    ),
    routes: assignment.routes,
  };
}
