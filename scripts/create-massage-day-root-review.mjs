import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CAMPAIGN_PATH,
  CONTACT_SHEET_MANIFEST_PATH,
  EXPECTED,
  FOCAL_PATH,
  INVENTORY_PATH,
  PROJECT_ROOT,
  REPLACEMENT_SELECTION_PATH,
  REUSE_SUBSTITUTION_PATH,
  ROOT_REVIEW_INPUT_PATH,
  ROOT_REVIEW_RECEIPT_PATH,
  jsonBytes,
  readJson,
  sha256,
  writeNewOrExact,
} from "./lib/massage-day-image-common.mjs";

function reviewFail(code) {
  throw new Error(`MASSAGE_DAY_ROOT_REVIEW_${code}`);
}

function exactStringSet(actual, expected, code) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    new Set(actual).size !== expected.length ||
    expected.some((value) => !actual.includes(value))
  ) reviewFail(code);
}

export async function validateRootReviewInput() {
  const [campaign, inventory, contactSheets, focal, replacementSelection, reuseSubstitution, input] = await Promise.all([
    readJson(CAMPAIGN_PATH, "ROOT_REVIEW"),
    readJson(INVENTORY_PATH, "ROOT_REVIEW"),
    readJson(CONTACT_SHEET_MANIFEST_PATH, "ROOT_REVIEW"),
    readJson(FOCAL_PATH, "ROOT_REVIEW"),
    readJson(REPLACEMENT_SELECTION_PATH, "ROOT_REVIEW"),
    readJson(REUSE_SUBSTITUTION_PATH, "ROOT_REVIEW"),
    readJson(ROOT_REVIEW_INPUT_PATH, "ROOT_REVIEW"),
  ]);
  if (
    campaign.value.platform?.platformKey !== "massage-day" ||
    inventory.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    inventory.value.platformKey !== "massage-day" ||
    inventory.value.campaign?.sha256 !== campaign.sha256 ||
    contactSheets.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    contactSheets.value.platformKey !== "massage-day" ||
    contactSheets.value.campaign?.sha256 !== campaign.sha256 ||
    contactSheets.value.inventory?.sha256 !== inventory.sha256 ||
    inventory.value.replacementSelection?.relativePath !== REPLACEMENT_SELECTION_PATH ||
    inventory.value.replacementSelection?.sha256 !== replacementSelection.sha256 ||
    inventory.value.replacementSelection?.count !== replacementSelection.value.replacements?.length ||
    inventory.value.focalPoints?.relativePath !== FOCAL_PATH ||
    inventory.value.focalPoints?.sha256 !== focal.sha256 ||
    inventory.value.focalPoints?.renderedInContactSheets !== true ||
    contactSheets.value.focalPoints?.relativePath !== FOCAL_PATH ||
    contactSheets.value.focalPoints?.sha256 !== focal.sha256 ||
    replacementSelection.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    replacementSelection.value.campaign?.sha256 !== campaign.sha256 ||
    inventory.value.reuseSubstitution?.relativePath !== REUSE_SUBSTITUTION_PATH ||
    inventory.value.reuseSubstitution?.sha256 !== reuseSubstitution.sha256 ||
    inventory.value.reuseSubstitution?.count !== reuseSubstitution.value.substitutions?.length ||
    reuseSubstitution.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    focal.value.status !== "PROPOSED_AWAITING_ROOT_VISUAL_REVIEW" ||
    focal.value.platformKey !== "massage-day"
  ) reviewFail("BOUND_ARTIFACT_CONTRACT");
  if (
    input.value.schemaVersion !== "massage-day-template6-root-review-input/v1" ||
    input.value.status !== "ROOT_APPROVED" ||
    input.value.platformKey !== "massage-day" ||
    input.value.reviewer !== "root" ||
    input.value.campaign?.relativePath !== CAMPAIGN_PATH ||
    input.value.campaign?.sha256 !== campaign.sha256 ||
    input.value.inventory?.relativePath !== INVENTORY_PATH ||
    input.value.inventory?.sha256 !== inventory.sha256 ||
    input.value.contactSheets?.relativePath !== CONTACT_SHEET_MANIFEST_PATH ||
    input.value.contactSheets?.sha256 !== contactSheets.sha256 ||
    input.value.focalPoints?.relativePath !== FOCAL_PATH ||
    input.value.focalPoints?.sha256 !== focal.sha256 ||
    input.value.focalPoints?.responsiveCropsAuthorized !== true ||
    input.value.routeAssignmentAuthorized !== true ||
    !Array.isArray(input.value.rejectedAssets) ||
    input.value.rejectedAssets.length !== 0 ||
    !input.value.signedAt ||
    Number.isNaN(Date.parse(input.value.signedAt))
  ) reviewFail("INPUT_CONTRACT");

  const regionalIds = inventory.value.regional.map((entry) => entry.assetId);
  const editorialIds = inventory.value.editorial.map((entry) => entry.assetId);
  if (regionalIds.length !== EXPECTED.assets || editorialIds.length !== EXPECTED.editorials) {
    reviewFail("INVENTORY_COUNTS");
  }
  exactStringSet(input.value.regionalAssetsAccepted, regionalIds, "REGIONAL_DECISIONS");
  exactStringSet(input.value.editorialAssetsAccepted, editorialIds, "EDITORIAL_DECISIONS");
  if (contactSheets.value.sheets?.length !== 19) reviewFail("CONTACT_SHEET_COUNT");
  for (const sheet of contactSheets.value.sheets) {
    const bytes = await readFile(path.join(PROJECT_ROOT, sheet.relativePath)).catch(() =>
      reviewFail(`CONTACT_SHEET_MISSING:${sheet.relativePath}`),
    );
    if (sha256(bytes) !== sheet.sha256) reviewFail(`CONTACT_SHEET_HASH:${sheet.relativePath}`);
  }
  return {
    campaign,
    inventory,
    contactSheets,
    focal,
    replacementSelection,
    reuseSubstitution,
    input,
    regionalIds,
    editorialIds,
  };
}

export async function createRootReviewReceipt({ approvalFlag = false } = {}) {
  if (!approvalFlag) reviewFail("EXPLICIT_APPROVAL_FLAG_REQUIRED");
  const review = await validateRootReviewInput();
  const receipt = {
    schemaVersion: "massage-day-template6-root-review-receipt/v1",
    status: "ROOT_APPROVED",
    platformKey: "massage-day",
    reviewer: "root",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: review.campaign.sha256 },
    inventory: { relativePath: INVENTORY_PATH, sha256: review.inventory.sha256 },
    replacementSelection: {
      relativePath: REPLACEMENT_SELECTION_PATH,
      sha256: review.replacementSelection.sha256,
      count: review.replacementSelection.value.replacements.length,
    },
    reuseSubstitution: {
      relativePath: REUSE_SUBSTITUTION_PATH,
      sha256: review.reuseSubstitution.sha256,
      count: review.reuseSubstitution.value.substitutions.length,
    },
    contactSheets: { relativePath: CONTACT_SHEET_MANIFEST_PATH, sha256: review.contactSheets.sha256 },
    focalPoints: { relativePath: FOCAL_PATH, sha256: review.focal.sha256, responsiveCropsAuthorized: true },
    rootReviewInput: { relativePath: ROOT_REVIEW_INPUT_PATH, sha256: review.input.sha256 },
    decisions: {
      regionalAccepted: EXPECTED.assets,
      editorialAccepted: EXPECTED.editorials,
      rejected: 0,
      routeAssignmentAuthorized: true,
    },
    signedAt: review.input.value.signedAt,
  };
  const bytes = jsonBytes(receipt);
  await writeNewOrExact(ROOT_REVIEW_RECEIPT_PATH, bytes, "ROOT_REVIEW");
  return { ...receipt, sha256: sha256(bytes) };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  const approvalFlag = process.argv.includes("--approve-reviewed-assets");
  const receipt = await createRootReviewReceipt({ approvalFlag });
  console.log(JSON.stringify({ status: receipt.status, sha256: receipt.sha256 }, null, 2));
}
