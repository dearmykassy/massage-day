import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  CAMPAIGN_PATH,
  CONTACT_SHEET_MANIFEST_PATH,
  EXPECTED,
  FOCAL_PATH,
  INVENTORY_PATH,
  ROOT_REVIEW_INPUT_PATH,
  jsonBytes,
  readJson,
  sha256,
  writeNewOrExact,
} from "./lib/massage-day-image-common.mjs";

function fail(code) {
  throw new Error(`MASSAGE_DAY_ROOT_REVIEW_INPUT_${code}`);
}

export async function createRootReviewInput({ reviewedAt } = {}) {
  if (!reviewedAt || Number.isNaN(Date.parse(reviewedAt))) fail("REVIEWED_AT_REQUIRED");
  const [campaign, inventory, contactSheets, focal] = await Promise.all([
    readJson(CAMPAIGN_PATH, "ROOT_REVIEW_INPUT"),
    readJson(INVENTORY_PATH, "ROOT_REVIEW_INPUT"),
    readJson(CONTACT_SHEET_MANIFEST_PATH, "ROOT_REVIEW_INPUT"),
    readJson(FOCAL_PATH, "ROOT_REVIEW_INPUT"),
  ]);
  if (
    inventory.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    inventory.value.campaign?.sha256 !== campaign.sha256 ||
    contactSheets.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    contactSheets.value.inventory?.sha256 !== inventory.sha256 ||
    contactSheets.value.sheets?.length !== 19 ||
    inventory.value.regional?.length !== EXPECTED.assets ||
    inventory.value.editorial?.length !== EXPECTED.editorials ||
    focal.value.status !== "PROPOSED_AWAITING_ROOT_VISUAL_REVIEW"
  ) fail("AUTHORITY_NOT_READY");

  const input = {
    schemaVersion: "massage-day-template6-root-review-input/v1",
    status: "ROOT_APPROVED",
    platformKey: "massage-day",
    reviewer: "root",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: campaign.sha256 },
    inventory: { relativePath: INVENTORY_PATH, sha256: inventory.sha256 },
    contactSheets: { relativePath: CONTACT_SHEET_MANIFEST_PATH, sha256: contactSheets.sha256 },
    focalPoints: {
      relativePath: FOCAL_PATH,
      sha256: focal.sha256,
      responsiveCropsAuthorized: true,
    },
    regionalAssetsAccepted: inventory.value.regional.map((entry) => entry.assetId),
    editorialAssetsAccepted: inventory.value.editorial.map((entry) => entry.assetId),
    rejectedAssets: [],
    routeAssignmentAuthorized: true,
    signedAt: new Date(reviewedAt).toISOString(),
  };
  const bytes = jsonBytes(input);
  await writeNewOrExact(ROOT_REVIEW_INPUT_PATH, bytes, "ROOT_REVIEW_INPUT");
  return { status: input.status, sha256: sha256(bytes) };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  const reviewedAt = process.argv.find((argument) => argument.startsWith("--reviewed-at="))?.slice(14);
  console.log(JSON.stringify(await createRootReviewInput({ reviewedAt }), null, 2));
}
