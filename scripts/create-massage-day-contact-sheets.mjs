import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  CAMPAIGN_PATH,
  CAMPAIGN_ROOT,
  CONTACT_SHEET_MANIFEST_PATH,
  EXPECTED,
  FOCAL_PATH,
  GENERATED_RECEIPT_ROOT,
  INVENTORY_PATH,
  PROJECT_ROOT,
  REPLACEMENT_SELECTION_PATH,
  REUSE_PATH,
  REUSE_SUBSTITUTION_PATH,
  jsonBytes,
  readJson,
  sha256,
  writeNewOrExact,
  writeReplace,
} from "./lib/massage-day-image-common.mjs";

const ROUND_ROOT = `${CAMPAIGN_ROOT}/contact-sheets/round-01`;

function sheetFail(code) {
  throw new Error(`MASSAGE_DAY_CONTACT_SHEETS_${code}`);
}

async function verifiedImage(relativePath, expectedSha256, code) {
  const bytes = await readFile(path.join(PROJECT_ROOT, relativePath)).catch(() => sheetFail(`MISSING:${code}`));
  if (sha256(bytes) !== expectedSha256) sheetFail(`HASH:${code}`);
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 768 || metadata.height < 600) {
    sheetFail(`DIMENSIONS:${code}`);
  }
  return { bytes, sha256: expectedSha256, width: metadata.width, height: metadata.height, format: metadata.format };
}

async function collectReadyAssets() {
  const [campaign, reuse, replacementSelection, reuseSubstitution] = await Promise.all([
    readJson(CAMPAIGN_PATH, "CONTACT_SHEETS"),
    readJson(REUSE_PATH, "CONTACT_SHEETS"),
    readJson(REPLACEMENT_SELECTION_PATH, "CONTACT_SHEETS"),
    readJson(REUSE_SUBSTITUTION_PATH, "CONTACT_SHEETS"),
  ]);
  if (
    campaign.value.schemaVersion !== "massage-day-template6-image-campaign/v1" ||
    campaign.value.platform?.platformKey !== "massage-day" ||
    campaign.value.counts?.regionalMasters !== EXPECTED.assets ||
    campaign.value.counts?.generationJobs !== EXPECTED.newAssets + EXPECTED.editorials ||
    reuse.value.distribution?.total !== EXPECTED.reusedAssets ||
    campaign.value.reuseProvenance?.sha256 !== reuse.sha256 ||
    replacementSelection.value.schemaVersion !== "massage-day-template6-regional-replacement-selection/v1" ||
    replacementSelection.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    replacementSelection.value.platformKey !== "massage-day" ||
    replacementSelection.value.campaign?.relativePath !== CAMPAIGN_PATH ||
    replacementSelection.value.campaign?.sha256 !== campaign.sha256 ||
    !Array.isArray(replacementSelection.value.replacements)
  ) sheetFail("CAMPAIGN_CONTRACT");
  if (
    reuseSubstitution.value.schemaVersion !== "massage-day-template6-reuse-substitution-selection/v2" ||
    reuseSubstitution.value.status !== "READY_FOR_ROOT_VISUAL_REVIEW" ||
    reuseSubstitution.value.platformKey !== "massage-day" ||
    reuseSubstitution.value.counts?.substituted !== 24 ||
    !Array.isArray(reuseSubstitution.value.substitutions) ||
    reuseSubstitution.value.substitutions.length !== 24
  ) sheetFail("REUSE_SUBSTITUTION_CONTRACT");

  const replacements = new Map();
  for (const entry of replacementSelection.value.replacements) {
    if (
      typeof entry.logicalAssetId !== "string" ||
      typeof entry.selectedAssetId !== "string" ||
      ![
        entry.logicalAssetId.replace(/-v1$/u, "-v2"),
        entry.logicalAssetId.replace(/-v1$/u, "-v3"),
        entry.logicalAssetId.replace(/-v1$/u, "-v4"),
      ]
        .includes(entry.selectedAssetId) ||
      entry.decision !== "ACCEPT" ||
      ![
        `public/images/massage-day-template6/regional-masters/replacements/${entry.selectedAssetId}.png`,
        `${CAMPAIGN_ROOT}/replacements/${entry.selectedAssetId.slice(-2)}/generated/${entry.selectedAssetId}.png`,
      ].includes(entry.source?.relativePath) ||
      typeof entry.source?.sha256 !== "string" ||
      typeof entry.prompt?.relativePath !== "string" ||
      typeof entry.prompt?.sha256 !== "string" ||
      typeof entry.job?.relativePath !== "string" ||
      typeof entry.job?.sha256 !== "string" ||
      typeof entry.receipt?.relativePath !== "string" ||
      typeof entry.receipt?.sha256 !== "string" ||
      typeof entry.originalReceipt?.relativePath !== "string" ||
      typeof entry.originalReceipt?.sha256 !== "string" ||
      replacements.has(entry.logicalAssetId)
    ) sheetFail(`REPLACEMENT_CONTRACT:${entry.logicalAssetId ?? "UNKNOWN"}`);
    replacements.set(entry.logicalAssetId, entry);
  }

  const regional = [];
  const reuseSubstitutionById = new Map(
    reuseSubstitution.value.substitutions.map((entry) => [entry.logicalAssetId, entry]),
  );
  for (const entry of reuse.value.assets) {
    const substitution = reuseSubstitutionById.get(entry.assetId);
    const selectedMaster = substitution?.copiedMaster ?? entry.copiedMaster;
    if (
      substitution &&
      (substitution.decision !== "ACCEPT" ||
        substitution.reason !== "MIRROR_SELFIE_CONCEPT_ALIGNMENT" ||
        substitution.selectedSourcePlatform !== "feeling-hometai" ||
        substitution.copiedMaster?.relativePath !==
          `public/images/massage-day-template6/regional-masters/reused-v2/${entry.assetId}.webp` ||
        substitution.copiedMaster?.sha256 !== substitution.source?.sha256 ||
        typeof substitution.authority?.rootReview?.sha256 !== "string" ||
        typeof substitution.authority?.releaseReceipt?.sha256 !== "string")
    ) sheetFail(`REUSE_SUBSTITUTION_ENTRY:${entry.assetId}`);
    const image = await verifiedImage(selectedMaster.relativePath, selectedMaster.sha256, entry.assetId);
    regional.push({
      assetId: entry.assetId,
      sourceClass: "reused",
      status: "READY_FOR_ROOT_VISUAL_REVIEW",
      relativePath: selectedMaster.relativePath,
      authority: entry.authority,
      ...(substitution
        ? {
            reuseSubstitutionAuthority: {
              relativePath: REUSE_SUBSTITUTION_PATH,
              sha256: reuseSubstitution.sha256,
              source: substitution.source,
              authority: substitution.authority,
              reason: substitution.reason,
            },
          }
        : {}),
      ...image,
    });
  }

  const editorial = [];
  for (const campaignJob of campaign.value.jobs) {
    const job = await readJson(campaignJob.jobFile, "CONTACT_SHEETS");
    const promptBytes = await readFile(path.join(PROJECT_ROOT, campaignJob.promptFile)).catch(() =>
      sheetFail(`PROMPT_MISSING:${campaignJob.id}`),
    );
    if (
      job.value.id !== campaignJob.id ||
      job.value.promptSha256 !== campaignJob.promptSha256 ||
      sha256(promptBytes) !== campaignJob.promptSha256 ||
      job.value.generationMode !== "built-in-imagegen" ||
      job.value.executionContract?.callsRequired !== 1
    ) sheetFail(`JOB_CONTRACT:${campaignJob.id}`);
    const receiptPath = `${GENERATED_RECEIPT_ROOT}/${campaignJob.id}.json`;
    const receipt = await readJson(receiptPath, "CONTACT_SHEETS").catch(() =>
      sheetFail(`GENERATED_RECEIPT_MISSING:${campaignJob.id}`),
    );
    if (
      receipt.value.status !== "GENERATED_AND_RECORDED" ||
      receipt.value.platformKey !== "massage-day" ||
      receipt.value.campaign?.sha256 !== campaign.sha256 ||
      receipt.value.job?.sha256 !== job.sha256 ||
      receipt.value.prompt?.sha256 !== campaignJob.promptSha256 ||
      receipt.value.generation?.mode !== "built-in-imagegen" ||
      receipt.value.generation?.callsSubmitted !== 1 ||
      receipt.value.generation?.noBatchSubstitution !== true ||
      receipt.value.normalizedMaster?.relativePath !== job.value.outputFile
    ) sheetFail(`GENERATED_RECEIPT_CONTRACT:${campaignJob.id}`);
    const replacement = replacements.get(campaignJob.id);
    let image;
    let source;
    let generationReceipt;
    let replacementAuthority;
    if (replacement) {
      const [promptBytes, jobBytes, receiptBytes, originalReceiptBytes] = await Promise.all([
        readFile(path.join(PROJECT_ROOT, replacement.prompt.relativePath)),
        readFile(path.join(PROJECT_ROOT, replacement.job.relativePath)),
        readFile(path.join(PROJECT_ROOT, replacement.receipt.relativePath)),
        readFile(path.join(PROJECT_ROOT, replacement.originalReceipt.relativePath)),
      ]).catch(() => sheetFail(`REPLACEMENT_AUTHORITY_MISSING:${campaignJob.id}`));
      if (
        sha256(promptBytes) !== replacement.prompt.sha256 ||
        sha256(jobBytes) !== replacement.job.sha256 ||
        sha256(receiptBytes) !== replacement.receipt.sha256 ||
        sha256(originalReceiptBytes) !== replacement.originalReceipt.sha256
      ) sheetFail(`REPLACEMENT_AUTHORITY_HASH:${campaignJob.id}`);
      image = await verifiedImage(replacement.source.relativePath, replacement.source.sha256, replacement.selectedAssetId);
      source = replacement.source.relativePath;
      generationReceipt = replacement.receipt;
      replacementAuthority = {
        relativePath: REPLACEMENT_SELECTION_PATH,
        sha256: replacementSelection.sha256,
        selectedAssetId: replacement.selectedAssetId,
        originalReceipt: replacement.originalReceipt,
        reason: replacement.reason,
      };
    } else {
      image = await verifiedImage(
        receipt.value.normalizedMaster.relativePath,
        receipt.value.normalizedMaster.sha256,
        campaignJob.id,
      );
      source = receipt.value.normalizedMaster.relativePath;
      generationReceipt = { relativePath: receiptPath, sha256: receipt.sha256 };
    }
    const ready = {
      assetId: campaignJob.id,
      sourceClass: "new",
      status: "READY_FOR_ROOT_VISUAL_REVIEW",
      relativePath: source,
      generationReceipt,
      ...(replacementAuthority ? { replacementAuthority } : {}),
      promptSha256: campaignJob.promptSha256,
      activeOutput: campaignJob.activeOutput,
      ...image,
    };
    if (job.value.jobClass === "regional") regional.push(ready);
    else if (job.value.jobClass === "editorial") editorial.push(ready);
    else sheetFail(`JOB_CLASS:${campaignJob.id}`);
  }
  regional.sort((left, right) => left.assetId.localeCompare(right.assetId));
  editorial.sort((left, right) => left.assetId.localeCompare(right.assetId));
  if (
    regional.length !== EXPECTED.assets ||
    editorial.length !== EXPECTED.editorials ||
    new Set(regional.map((entry) => entry.assetId)).size !== EXPECTED.assets ||
    [...replacements.keys()].some((assetId) => !regional.some((entry) => entry.assetId === assetId))
  ) sheetFail(`READY_COUNTS:${regional.length}:${editorial.length}`);
  if (reuseSubstitutionById.size !== 24) sheetFail("REUSE_SUBSTITUTION_DUPLICATE");
  return { campaign, reuse, replacementSelection, reuseSubstitution, regional, editorial };
}

function labelSvg(label, width, height) {
  const safe = label.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<rect width="100%" height="34" y="${height - 34}" fill="#111" fill-opacity=".82"/>` +
      `<text x="12" y="${height - 11}" fill="#fff" font-family="Arial,sans-serif" font-size="17" font-weight="700">${safe}</text>` +
    `</svg>`,
  );
}

async function createSheet(entries, relativePath, columns = 3, focalPoints = {}) {
  const cellWidth = 360;
  const cellHeight = 236;
  const gap = 12;
  const rows = Math.ceil(entries.length / columns);
  const width = columns * cellWidth + (columns + 1) * gap;
  const height = rows * cellHeight + (rows + 1) * gap;
  const composites = [];
  for (const [index, entry] of entries.entries()) {
    const focal = focalPoints[entry.assetId] ?? { xPermille: 500, yPermille: 500 };
    const oriented = await sharp(entry.bytes).rotate().toBuffer({ resolveWithObject: true });
    const mobileExtract = focalExtract(
      oriented.info.width,
      oriented.info.height,
      768,
      600,
      focal.xPermille,
      focal.yPermille,
    );
    const mobile = await sharp(oriented.data)
      .extract(mobileExtract)
      .resize(768, 600, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const inset320 = await renderedViewportInset(mobile, 320, 300, 96, 90);
    const inset390 = await renderedViewportInset(mobile, 390, 300, 96, 74);
    const thumbnail = await sharp(entry.bytes)
      .rotate()
      .resize(cellWidth, cellHeight, { fit: "cover", position: "centre" })
      .composite([
        { input: inset320, left: cellWidth - 108, top: 10 },
        { input: inset390, left: cellWidth - 108, top: 108 },
        { input: labelSvg(entry.assetId, cellWidth, cellHeight), left: 0, top: 0 },
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();
    composites.push({
      input: thumbnail,
      left: gap + (index % columns) * (cellWidth + gap),
      top: gap + Math.floor(index / columns) * (cellHeight + gap),
    });
  }
  const bytes = await sharp({ create: { width, height, channels: 3, background: "#e9e3d8" } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeNewOrExact(relativePath, bytes, "CONTACT_SHEETS");
  return { relativePath, sha256: sha256(bytes), width, height, assets: entries.map((entry) => entry.assetId) };
}

function focalExtract(width, height, targetWidth, targetHeight, xPermille, yPermille) {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = width / height;
  const cropHeight = sourceRatio > targetRatio ? height : Math.round(width / targetRatio);
  const cropWidth = sourceRatio > targetRatio ? Math.round(height * targetRatio) : width;
  const centerX = width * (xPermille / 1000);
  const centerY = height * (yPermille / 1000);
  return {
    left: Math.max(0, Math.min(width - cropWidth, Math.round(centerX - cropWidth / 2))),
    top: Math.max(0, Math.min(height - cropHeight, Math.round(centerY - cropHeight / 2))),
    width: cropWidth,
    height: cropHeight,
  };
}

async function renderedViewportInset(mobileBytes, viewportWidth, viewportHeight, outputWidth, outputHeight) {
  const extract = focalExtract(768, 600, viewportWidth, viewportHeight, 500, 500);
  return sharp(mobileBytes)
    .extract(extract)
    .resize(outputWidth, outputHeight, { fit: "fill" })
    .extend({ top: 3, bottom: 3, left: 3, right: 3, background: "#fff" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function createContactSheets() {
  const [ready, focal, currentInventory, currentManifest] = await Promise.all([
    collectReadyAssets(),
    readJson(FOCAL_PATH, "CONTACT_SHEETS"),
    readJson(INVENTORY_PATH, "CONTACT_SHEETS"),
    readJson(CONTACT_SHEET_MANIFEST_PATH, "CONTACT_SHEETS"),
  ]);
  if (
    currentInventory.value.platformKey !== "massage-day" ||
    !["AWAITING_144_REGIONAL_AND_3_EDITORIAL_GENERATIONS", "READY_FOR_ROOT_VISUAL_REVIEW"].includes(currentInventory.value.status) ||
    currentManifest.value.platformKey !== "massage-day" ||
    !["NOT_CREATED_GENERATED_MASTERS_MISSING", "READY_FOR_ROOT_VISUAL_REVIEW"].includes(currentManifest.value.status) ||
    focal.value.status !== "PROPOSED_AWAITING_ROOT_VISUAL_REVIEW" ||
    focal.value.platformKey !== "massage-day" ||
    Object.keys(focal.value.points ?? {}).length !== EXPECTED.assets
  ) sheetFail("STATE_TRANSITION");

  const sheets = [];
  for (let offset = 0; offset < ready.regional.length; offset += 12) {
    const index = offset / 12 + 1;
    sheets.push(await createSheet(
      ready.regional.slice(offset, offset + 12),
      `${ROUND_ROOT}/regional-${String(index).padStart(2, "0")}.png`,
      3,
      focal.value.points,
    ));
  }
  sheets.push(await createSheet(ready.editorial, `${ROUND_ROOT}/editorial-01.png`));
  if (sheets.length !== 19) sheetFail(`SHEET_COUNT:${sheets.length}`);

  const inventoryEntry = (entry) => {
    const copy = { ...entry };
    delete copy.bytes;
    return copy;
  };
  const inventory = {
    schemaVersion: "massage-day-template6-contact-sheet-inventory/v1",
    status: "READY_FOR_ROOT_VISUAL_REVIEW",
    platformKey: "massage-day",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: ready.campaign.sha256 },
    replacementSelection: {
      relativePath: REPLACEMENT_SELECTION_PATH,
      sha256: ready.replacementSelection.sha256,
      count: ready.replacementSelection.value.replacements.length,
    },
    reuseSubstitution: {
      relativePath: REUSE_SUBSTITUTION_PATH,
      sha256: ready.reuseSubstitution.sha256,
      count: ready.reuseSubstitution.value.substitutions.length,
    },
    focalPoints: {
      relativePath: FOCAL_PATH,
      sha256: focal.sha256,
      renderedInContactSheets: true,
    },
    counts: { regional: 216, reusedRegional: 72, newRegional: 144, editorial: 3 },
    regional: ready.regional.map(inventoryEntry),
    editorial: ready.editorial.map(inventoryEntry),
  };
  const inventoryBytes = jsonBytes(inventory);
  const manifest = {
    schemaVersion: "massage-day-template6-contact-sheets/v1",
    status: "READY_FOR_ROOT_VISUAL_REVIEW",
    platformKey: "massage-day",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: ready.campaign.sha256 },
    inventory: { relativePath: INVENTORY_PATH, sha256: sha256(inventoryBytes) },
    focalPoints: { relativePath: FOCAL_PATH, sha256: focal.sha256 },
    counts: {
      regionalSheets: 18,
      regionalAssetsPerSheet: 12,
      editorialSheets: 1,
      eachRegionalAssetIncludesActual320x300And390x300MobileRenderInsets: true,
    },
    sheets,
  };
  await writeReplace(INVENTORY_PATH, inventoryBytes);
  await writeReplace(CONTACT_SHEET_MANIFEST_PATH, jsonBytes(manifest));
  return { status: manifest.status, regional: ready.regional.length, editorial: ready.editorial.length, sheets: sheets.length };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) console.log(JSON.stringify(await createContactSheets(), null, 2));
