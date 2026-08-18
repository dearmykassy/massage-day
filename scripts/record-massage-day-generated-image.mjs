import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  CAMPAIGN_PATH,
  GENERATED_RECEIPT_ROOT,
  PROJECT_ROOT,
  jsonBytes,
  readJson,
  sha256,
  writeNewOrExact,
} from "./lib/massage-day-image-common.mjs";

function recordFail(code) {
  throw new Error(`MASSAGE_DAY_IMAGE_RECORD_${code}`);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function recordGeneratedImage({ jobId, sourcePath, callReference }) {
  if (!/^mday-t6-(?:rgn-\d{3}|editorial-(?:home-hero|blog-0[12]))-v1$/u.test(jobId)) {
    recordFail(`JOB_ID:${jobId}`);
  }
  if (!sourcePath) recordFail("SOURCE_REQUIRED");

  const [campaign, job] = await Promise.all([
    readJson(CAMPAIGN_PATH, "IMAGE_RECORD"),
    readJson(`${path.dirname(CAMPAIGN_PATH)}/jobs/${jobId}.json`, "IMAGE_RECORD"),
  ]);
  const campaignJob = campaign.value.jobs?.find((entry) => entry.id === jobId);
  if (
    campaign.value.platform?.platformKey !== "massage-day" ||
    campaignJob?.jobFile !== `${path.dirname(CAMPAIGN_PATH)}/jobs/${jobId}.json` ||
    job.value.id !== jobId ||
    job.value.generationMode !== "built-in-imagegen" ||
    job.value.executionContract?.callsRequired !== 1 ||
    job.value.executionContract?.noBatchSubstitution !== true ||
    job.value.promptSha256 !== campaignJob.promptSha256
  ) recordFail(`JOB_CONTRACT:${jobId}`);

  const prompt = await readFile(path.join(PROJECT_ROOT, job.value.promptFile));
  if (sha256(prompt) !== job.value.promptSha256) recordFail(`PROMPT_HASH:${jobId}`);

  const sourceAbsolute = path.isAbsolute(sourcePath)
    ? sourcePath
    : path.join(PROJECT_ROOT, sourcePath);
  const sourceBytes = await readFile(sourceAbsolute).catch(() => recordFail(`SOURCE_MISSING:${jobId}`));
  const sourceMetadata = await sharp(sourceBytes).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height || sourceMetadata.width < 1000 || sourceMetadata.height < 600) {
    recordFail(`SOURCE_DIMENSIONS:${jobId}`);
  }
  const outputAbsolute = path.join(PROJECT_ROOT, job.value.outputFile);
  const sourceAlreadyAtExactOutput = path.resolve(sourceAbsolute) === path.resolve(outputAbsolute);
  if (sourceAlreadyAtExactOutput && sourceMetadata.format !== "png") {
    recordFail(`EXACT_OUTPUT_NOT_PNG:${jobId}`);
  }
  const normalized = sourceAlreadyAtExactOutput
    ? sourceBytes
    : await sharp(sourceBytes)
      .rotate()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
  const outputMetadata = await sharp(normalized).metadata();
  await writeNewOrExact(job.value.outputFile, normalized, "IMAGE_RECORD");

  const receipt = {
    schemaVersion: "massage-day-template6-generated-image-receipt/v1",
    status: "GENERATED_AND_RECORDED",
    platformKey: "massage-day",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: campaign.sha256 },
    job: { relativePath: campaignJob.jobFile, sha256: job.sha256, id: jobId },
    prompt: { relativePath: job.value.promptFile, sha256: job.value.promptSha256 },
    generation: {
      mode: "built-in-imagegen",
      callsSubmitted: 1,
      callReference: callReference ?? null,
      noBatchSubstitution: true,
    },
    sourceCapture: {
      sha256: sha256(sourceBytes),
      width: sourceMetadata.width,
      height: sourceMetadata.height,
      format: sourceMetadata.format,
    },
    normalizedMaster: {
      relativePath: job.value.outputFile,
      sha256: sha256(normalized),
      width: outputMetadata.width,
      height: outputMetadata.height,
      format: outputMetadata.format,
    },
  };
  await writeNewOrExact(`${GENERATED_RECEIPT_ROOT}/${jobId}.json`, jsonBytes(receipt), "IMAGE_RECORD");
  return receipt;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  const jobId = argument("--job");
  const sourcePath = argument("--source");
  const callReference = argument("--call-reference");
  const receipt = await recordGeneratedImage({ jobId, sourcePath, callReference });
  console.log(JSON.stringify({ status: receipt.status, jobId: receipt.job.id }, null, 2));
}
