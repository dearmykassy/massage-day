import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  ACTIVE_ROOT_KEYS,
  ASSIGNMENT_PATH,
  CAMPAIGN_PATH,
  DERIVATIVE_PROFILES,
  EXPECTED,
  FOCAL_PATH,
  HOME_REGION_ROOT,
  INVENTORY_PATH,
  PROJECT_ROOT,
  RELEASE_RECEIPT_PATH,
  RELEASE_ROOT,
  REUSE_PATH,
  ROOT_REVIEW_RECEIPT_PATH,
  buildAssetDefinitions,
  buildRegionNodes,
  jsonBytes,
  readJson,
  sha256,
  verifyAssignment,
  writeNewOrExact,
  writeReplace,
} from "./lib/massage-day-image-common.mjs";
import { validateRootReviewInput } from "./create-massage-day-root-review.mjs";

function releaseFail(code) {
  throw new Error(`MASSAGE_DAY_IMAGE_RELEASE_${code}`);
}

function focalExtract(width, height, targetWidth, targetHeight, xPermille, yPermille) {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = width / height;
  let cropWidth;
  let cropHeight;
  if (sourceRatio > targetRatio) {
    cropHeight = height;
    cropWidth = Math.round(height * targetRatio);
  } else {
    cropWidth = width;
    cropHeight = Math.round(width / targetRatio);
  }
  const centerX = width * (xPermille / 1000);
  const centerY = height * (yPermille / 1000);
  const left = Math.max(0, Math.min(width - cropWidth, Math.round(centerX - cropWidth / 2)));
  const top = Math.max(0, Math.min(height - cropHeight, Math.round(centerY - cropHeight / 2)));
  return { left, top, width: cropWidth, height: cropHeight };
}

async function derivativeFromMaster(masterBytes, profile, focal) {
  const oriented = await sharp(masterBytes).rotate().toBuffer({ resolveWithObject: true });
  const extract = focalExtract(
    oriented.info.width,
    oriented.info.height,
    profile.width,
    profile.height,
    focal.xPermille,
    focal.yPermille,
  );
  return sharp(oriented.data)
    .extract(extract)
    .resize(profile.width, profile.height, { fit: "fill" })
    .webp({ quality: 84, effort: 6 })
    .toBuffer();
}

async function readExactBytes(relativePath, expectedSha256, code) {
  const bytes = await readFile(path.join(PROJECT_ROOT, relativePath)).catch(() => releaseFail(`MISSING:${code}`));
  if (sha256(bytes) !== expectedSha256) releaseFail(`HASH:${code}`);
  return bytes;
}

async function verifyReleaseAuthority() {
  const validated = await validateRootReviewInput();
  const receipt = await readJson(ROOT_REVIEW_RECEIPT_PATH, "IMAGE_RELEASE");
  if (
    receipt.value.schemaVersion !== "massage-day-template6-root-review-receipt/v1" ||
    receipt.value.status !== "ROOT_APPROVED" ||
    receipt.value.platformKey !== "massage-day" ||
    receipt.value.reviewer !== "root" ||
    receipt.value.campaign?.sha256 !== validated.campaign.sha256 ||
    receipt.value.inventory?.sha256 !== validated.inventory.sha256 ||
    receipt.value.replacementSelection?.sha256 !== validated.replacementSelection.sha256 ||
    receipt.value.replacementSelection?.count !== validated.replacementSelection.value.replacements.length ||
    receipt.value.reuseSubstitution?.sha256 !== validated.reuseSubstitution.sha256 ||
    receipt.value.reuseSubstitution?.count !== validated.reuseSubstitution.value.substitutions.length ||
    receipt.value.contactSheets?.sha256 !== validated.contactSheets.sha256 ||
    receipt.value.focalPoints?.sha256 !== validated.focal.sha256 ||
    receipt.value.focalPoints?.responsiveCropsAuthorized !== true ||
    receipt.value.rootReviewInput?.sha256 !== validated.input.sha256 ||
    receipt.value.decisions?.regionalAccepted !== EXPECTED.assets ||
    receipt.value.decisions?.editorialAccepted !== EXPECTED.editorials ||
    receipt.value.decisions?.routeAssignmentAuthorized !== true
  ) releaseFail("ROOT_REVIEW_RECEIPT");
  return { ...validated, receipt };
}

async function releaseRegional(authority, assignment, reuse) {
  const inventoryById = new Map(authority.inventory.value.regional.map((entry) => [entry.assetId, entry]));
  const reuseById = new Map(reuse.value.assets.map((entry) => [entry.assetId, entry]));
  const released = [];
  for (const asset of buildAssetDefinitions()) {
    const inventory = inventoryById.get(asset.assetId);
    if (!inventory || inventory.sourceClass !== asset.sourceClass) releaseFail(`INVENTORY:${asset.assetId}`);
    const masterBytes = await readExactBytes(inventory.relativePath, inventory.sha256, asset.assetId);
    const focal = authority.focal.value.points?.[asset.assetId];
    if (
      !focal ||
      !Number.isInteger(focal.xPermille) ||
      !Number.isInteger(focal.yPermille) ||
      focal.xPermille < 0 || focal.xPermille > 1000 ||
      focal.yPermille < 0 || focal.yPermille > 1000
    ) releaseFail(`FOCAL:${asset.assetId}`);

    const derivatives = {};
    for (const [profileName, profile] of Object.entries(DERIVATIVE_PROFILES)) {
      const bytes = await derivativeFromMaster(masterBytes, profile, focal);
      const relativePath = `${RELEASE_ROOT}/${asset.assetId}/${profileName}.webp`;
      await writeNewOrExact(relativePath, bytes, "IMAGE_RELEASE");
      derivatives[profileName] = { relativePath, sha256: sha256(bytes), ...profile, format: "webp" };
    }
    const provenance = {
      schemaVersion: "massage-day-template6-regional-image-provenance/v1",
      status: "ROOT_APPROVED_RELEASED",
      platformKey: "massage-day",
      assetId: asset.assetId,
      sourceClass: asset.sourceClass,
      source: {
        relativePath: inventory.relativePath,
        sha256: inventory.sha256,
        ...(asset.sourceClass === "reused"
          ? {
              reuseAuthority:
                inventory.reuseSubstitutionAuthority ??
                reuseById.get(asset.assetId)?.authority ??
                releaseFail(`REUSE_AUTHORITY:${asset.assetId}`),
            }
          : {
              generationReceipt: inventory.generationReceipt,
              ...(inventory.replacementAuthority
                ? { replacementAuthority: inventory.replacementAuthority }
                : {}),
            }),
      },
      campaign: { relativePath: CAMPAIGN_PATH, sha256: authority.campaign.sha256 },
      inventory: { relativePath: INVENTORY_PATH, sha256: authority.inventory.sha256 },
      rootReview: {
        relativePath: ROOT_REVIEW_RECEIPT_PATH,
        sha256: authority.receipt.sha256,
        reviewer: "root",
        sourceDecision: "ACCEPT",
        responsiveCropsAuthorized: true,
      },
      focalPoint: { ...focal, source: { relativePath: FOCAL_PATH, sha256: authority.focal.sha256 } },
      plannedRouteUses: asset.routeUses,
      derivatives,
    };
    const provenanceBytes = jsonBytes(provenance);
    const provenancePath = `${RELEASE_ROOT}/${asset.assetId}/provenance.json`;
    await writeNewOrExact(provenancePath, provenanceBytes, "IMAGE_RELEASE");
    released.push({
      assetId: asset.assetId,
      sourceClass: asset.sourceClass,
      plannedRouteUses: asset.routeUses,
      provenance: { relativePath: provenancePath, sha256: sha256(provenanceBytes) },
      derivatives,
    });
  }
  return released;
}

async function releaseHomeCards(assignment, inventory, focal) {
  const inventoryById = new Map(inventory.regional.map((entry) => [entry.assetId, entry]));
  const outputs = [];
  for (const rootKey of ACTIVE_ROOT_KEYS) {
    const route = assignment.routes[`/areas/${rootKey}`];
    const source = inventoryById.get(route?.assetId);
    if (!source) releaseFail(`HOME_REGION_SOURCE:${rootKey}`);
    const master = await readExactBytes(source.relativePath, source.sha256, `HOME_REGION:${rootKey}`);
    const bytes = await derivativeFromMaster(master, { width: 720, height: 720 }, focal.points[route.assetId]);
    const relativePath = `${HOME_REGION_ROOT}/${rootKey}.webp`;
    await writeNewOrExact(relativePath, bytes, "IMAGE_RELEASE");
    outputs.push({ rootKey, assetId: route.assetId, relativePath, sha256: sha256(bytes), width: 720, height: 720 });
  }
  return outputs;
}

async function releaseEditorials(inventory) {
  const outputs = [];
  for (const entry of inventory.editorial) {
    if (!entry.activeOutput) releaseFail(`EDITORIAL_OUTPUT:${entry.assetId}`);
    const master = await readExactBytes(entry.relativePath, entry.sha256, entry.assetId);
    const bytes = await sharp(master)
      .rotate()
      .resize(1600, 900, { fit: "cover", position: "centre" })
      .webp({ quality: 86, effort: 6 })
      .toBuffer();
    await writeNewOrExact(entry.activeOutput, bytes, "IMAGE_RELEASE");
    outputs.push({ assetId: entry.assetId, relativePath: entry.activeOutput, sha256: sha256(bytes), width: 1600, height: 900 });
  }
  return outputs;
}

export async function releaseTemplate6Images() {
  const authority = await verifyReleaseAuthority();
  const [assignment, reuse, nodes] = await Promise.all([
    readJson(ASSIGNMENT_PATH, "IMAGE_RELEASE"),
    readJson(REUSE_PATH, "IMAGE_RELEASE"),
    buildRegionNodes(),
  ]);
  if (
    assignment.value.platformKey !== "massage-day" ||
    !["PLANNED_AWAITING_GENERATION_AND_ROOT_REVIEW", "ROOT_APPROVED_RELEASED"].includes(assignment.value.status) ||
    assignment.value.focalCropMetadata?.sha256 !== authority.focal.sha256 ||
    reuse.value.platformKey !== "massage-day" ||
    reuse.value.assets?.length !== EXPECTED.reusedAssets
  ) releaseFail("INPUT_CONTRACT");
  verifyAssignment(nodes, buildAssetDefinitions(), assignment.value.routes);

  const regional = await releaseRegional(authority, assignment.value, reuse);
  const homeRegions = await releaseHomeCards(assignment.value, authority.inventory.value, authority.focal.value);
  const editorials = await releaseEditorials(authority.inventory.value);
  const finalAssignment = {
    ...assignment.value,
    status: "ROOT_APPROVED_RELEASED",
    focalCropMetadata: {
      relativePath: FOCAL_PATH,
      sha256: authority.focal.sha256,
      status: "ROOT_APPROVED",
      responsiveCropsAuthorized: true,
    },
    rootReview: { relativePath: ROOT_REVIEW_RECEIPT_PATH, sha256: authority.receipt.sha256, reviewer: "root" },
    assets: Object.fromEntries(regional.map((entry) => [entry.assetId, entry])),
  };
  const finalAssignmentBytes = jsonBytes(finalAssignment);
  await writeReplace(ASSIGNMENT_PATH, finalAssignmentBytes);

  const receipt = {
    schemaVersion: "massage-day-template6-regional-image-release-receipt/v1",
    status: "ROOT_APPROVED_RELEASED",
    platformKey: "massage-day",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: authority.campaign.sha256 },
    replacementSelection: {
      relativePath: authority.inventory.value.replacementSelection.relativePath,
      sha256: authority.replacementSelection.sha256,
      count: authority.replacementSelection.value.replacements.length,
    },
    reuseSubstitution: {
      relativePath: authority.inventory.value.reuseSubstitution.relativePath,
      sha256: authority.reuseSubstitution.sha256,
      count: authority.reuseSubstitution.value.substitutions.length,
    },
    rootReview: { relativePath: ROOT_REVIEW_RECEIPT_PATH, sha256: authority.receipt.sha256 },
    assignment: { relativePath: ASSIGNMENT_PATH, sha256: sha256(finalAssignmentBytes) },
    distribution: finalAssignment.distribution,
    releasedAssets: regional.map((entry) => ({ assetId: entry.assetId, provenance: entry.provenance })),
    homeRegions,
    editorials,
  };
  const receiptBytes = jsonBytes(receipt);
  await writeNewOrExact(RELEASE_RECEIPT_PATH, receiptBytes, "IMAGE_RELEASE");
  return { status: receipt.status, regional: regional.length, homeRegions: homeRegions.length, editorials: editorials.length };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) console.log(JSON.stringify(await releaseTemplate6Images(), null, 2));
