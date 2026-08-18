import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  CAMPAIGN_PATH,
  CAMPAIGN_ROOT,
  GENERATED_RECEIPT_ROOT,
  PROJECT_ROOT,
  REPLACEMENT_SELECTION_PATH,
  jsonBytes,
  readJson,
  sha256,
  writeReplace,
} from "./lib/massage-day-image-common.mjs";

const REPLACEMENT_NUMBERS = Object.freeze([
  84, 85, 86, 87, 89, 91, 93, 95, 96, 97, 98, 99, 101, 105, 106, 107, 109,
  114, 117, 118, 119, 120, 174, 179, 191, 200, 211,
]);
const V3_REPLACEMENT_NUMBERS = new Set([
  85, 91, 93, 97, 98, 101, 109, 118, 119, 120, 174, 200, 211,
]);
const V4_REPLACEMENT_NUMBERS = new Set([179]);

function replacementFail(code) {
  throw new Error(`MASSAGE_DAY_REPLACEMENT_SELECTION_${code}`);
}

function idFor(number, version) {
  return `mday-t6-rgn-${String(number).padStart(3, "0")}-${version}`;
}

function replacementReason(number) {
  if (number === 114) return "V1_FORBIDDEN_BED_OR_DAYBED_BACKGROUND";
  if (number === 174 || number === 179) return "V1_PHONE_OVERLAPPED_FACE_OR_EYE";
  return "V1_VISIBLE_PHONE_LOGO_OR_BRAND_MARK";
}

function selectedVersion(number) {
  if (V4_REPLACEMENT_NUMBERS.has(number)) return "v4";
  return V3_REPLACEMENT_NUMBERS.has(number) ? "v3" : "v2";
}

function rootOriginalId(lineage) {
  return lineage?.rootOriginalId ?? lineage?.rootOriginal?.id ?? lineage?.supersedesId;
}

async function exactFile(relativePath, expectedSha256, code) {
  const bytes = await readFile(path.join(PROJECT_ROOT, relativePath)).catch(() =>
    replacementFail(`MISSING:${code}:${relativePath}`),
  );
  if (sha256(bytes) !== expectedSha256) replacementFail(`HASH:${code}:${relativePath}`);
  return bytes;
}

export async function createReplacementSelection() {
  const campaign = await readJson(CAMPAIGN_PATH, "REPLACEMENT_SELECTION");
  const replacements = [];
  const selectedHashes = new Set();

  for (const number of REPLACEMENT_NUMBERS) {
    const logicalAssetId = idFor(number, "v1");
    const version = selectedVersion(number);
    const selectedAssetId = idFor(number, version);
    const replacementRoot = `${CAMPAIGN_ROOT}/replacements/${version}`;
    const promptPath = `${replacementRoot}/prompts/${selectedAssetId}.txt`;
    const jobPath = `${replacementRoot}/jobs/${selectedAssetId}.json`;
    const receiptPath = `${replacementRoot}/receipts/${selectedAssetId}.json`;
    const originalReceiptPath = `${GENERATED_RECEIPT_ROOT}/${logicalAssetId}.json`;
    const [promptBytes, job, receipt, originalReceipt] = await Promise.all([
      readFile(path.join(PROJECT_ROOT, promptPath)).catch(() => replacementFail(`PROMPT:${selectedAssetId}`)),
      readJson(jobPath, "REPLACEMENT_SELECTION"),
      readJson(receiptPath, "REPLACEMENT_SELECTION"),
      readJson(originalReceiptPath, "REPLACEMENT_SELECTION"),
    ]);

    if (
      ![
        "massage-day-template6-image-replacement-job/v2",
        "massage-day-template6-image-replacement-job/v3",
        "massage-day-template6-image-replacement-job/v4",
      ].includes(job.value.schemaVersion) ||
      job.value.id !== selectedAssetId ||
      rootOriginalId(job.value.replacementLineage) !== logicalAssetId ||
      job.value.promptFile !== promptPath ||
      job.value.promptSha256 !== sha256(promptBytes) ||
      job.value.executionContract?.callsRequired !== 1 ||
      ![
        "massage-day-template6-generated-image-replacement-receipt/v2",
        "massage-day-template6-generated-image-replacement-receipt/v3",
        "massage-day-template6-generated-image-replacement-receipt/v4",
      ].includes(receipt.value.schemaVersion) ||
      receipt.value.status !== "GENERATED_AND_RECORDED" ||
      receipt.value.platformKey !== "massage-day" ||
      rootOriginalId(receipt.value.replacementLineage) !== logicalAssetId ||
      receipt.value.job?.relativePath !== jobPath ||
      receipt.value.job?.sha256 !== job.sha256 ||
      receipt.value.prompt?.relativePath !== promptPath ||
      receipt.value.prompt?.sha256 !== sha256(promptBytes) ||
      receipt.value.generation?.mode !== "built-in-imagegen" ||
      receipt.value.generation?.callsSubmitted !== 1 ||
      receipt.value.generation?.noBatchSubstitution !== true ||
      !["ACCEPT", "ACCEPTED"].includes(receipt.value.review?.status) ||
      receipt.value.review?.reviewer == null ||
      originalReceipt.value.status !== "GENERATED_AND_RECORDED" ||
      originalReceipt.value.job?.id !== logicalAssetId
    ) replacementFail(`CONTRACT:${selectedAssetId}`);

    const [sourceBytes] = await Promise.all([
      exactFile(
        receipt.value.normalizedMaster.relativePath,
        receipt.value.normalizedMaster.sha256,
        selectedAssetId,
      ),
      exactFile(
        originalReceipt.value.normalizedMaster.relativePath,
        originalReceipt.value.normalizedMaster.sha256,
        logicalAssetId,
      ),
    ]);
    const metadata = await sharp(sourceBytes).metadata();
    if (
      metadata.format !== "png" ||
      metadata.width !== receipt.value.normalizedMaster.width ||
      metadata.height !== receipt.value.normalizedMaster.height ||
      metadata.width < 1000 ||
      metadata.height < 600 ||
      selectedHashes.has(receipt.value.normalizedMaster.sha256)
    ) replacementFail(`IMAGE:${selectedAssetId}`);
    selectedHashes.add(receipt.value.normalizedMaster.sha256);

    replacements.push({
      logicalAssetId,
      selectedAssetId,
      decision: "ACCEPT",
      reason: replacementReason(number),
      source: {
        relativePath: receipt.value.normalizedMaster.relativePath,
        sha256: receipt.value.normalizedMaster.sha256,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
      prompt: { relativePath: promptPath, sha256: sha256(promptBytes) },
      job: { relativePath: jobPath, sha256: job.sha256 },
      receipt: { relativePath: receiptPath, sha256: receipt.sha256 },
      originalReceipt: { relativePath: originalReceiptPath, sha256: originalReceipt.sha256 },
      reviewer: receipt.value.review.reviewer,
      reviewedAt: receipt.value.review.reviewedAt,
    });
  }

  if (
    replacements.length !== REPLACEMENT_NUMBERS.length ||
    new Set(replacements.map((entry) => entry.logicalAssetId)).size !== replacements.length
  ) replacementFail("COUNT_OR_DUPLICATE");

  const selection = {
    schemaVersion: "massage-day-template6-regional-replacement-selection/v1",
    status: "READY_FOR_ROOT_VISUAL_REVIEW",
    platformKey: "massage-day",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: campaign.sha256 },
    policy: {
      originalV1Preserved: true,
      replacementVersions: {
        v2: replacements.length - V3_REPLACEMENT_NUMBERS.size - V4_REPLACEMENT_NUMBERS.size,
        v3: V3_REPLACEMENT_NUMBERS.size,
        v4: V4_REPLACEMENT_NUMBERS.size,
      },
      oneBuiltInImagegenCallPerReplacement: true,
      rootReviewStillRequired: true,
    },
    counts: {
      rejectedV1: replacements.length,
      selectedV2: replacements.length - V3_REPLACEMENT_NUMBERS.size - V4_REPLACEMENT_NUMBERS.size,
      selectedV3: V3_REPLACEMENT_NUMBERS.size,
      selectedV4: V4_REPLACEMENT_NUMBERS.size,
    },
    replacements,
  };
  const bytes = jsonBytes(selection);
  await writeReplace(REPLACEMENT_SELECTION_PATH, bytes);
  return { status: selection.status, replacements: replacements.length, sha256: sha256(bytes) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(await createReplacementSelection(), null, 2));
}
