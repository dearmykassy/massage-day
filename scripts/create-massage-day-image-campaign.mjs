import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  ASSIGNMENT_PATH,
  CAMPAIGN_KEY,
  CAMPAIGN_PATH,
  CAMPAIGN_ROOT,
  CONTACT_SHEET_MANIFEST_PATH,
  EDITORIAL_MASTER_ROOT,
  EXPECTED,
  FOCAL_PATH,
  INVENTORY_PATH,
  MASTER_ROOT,
  PROJECT_ROOT,
  REUSE_PATH,
  ROOT_REVIEW_INPUT_PATH,
  buildAssetDefinitions,
  buildAssignments,
  buildRegionNodes,
  jsonBytes,
  plannedAssignmentDocument,
  proposedFocalDocument,
  regionalAssetId,
  sha256,
  writeNewOrExact,
} from "./lib/massage-day-image-common.mjs";

export const CAMPAIGN_SCHEMA = "massage-day-template6-image-campaign/v1";
export const JOB_SCHEMA = "massage-day-template6-image-job/v1";

const CODEX_ROOT = path.resolve(PROJECT_ROOT, "..");
const SOURCE_REPOSITORIES = Object.freeze({
  rang: path.join(CODEX_ROOT, "rang-therapy-seo-release"),
  geonma: path.join(CODEX_ROOT, "geonmae-banhada"),
  honhyeol: path.join(CODEX_ROOT, "honhyeol-massage"),
});

function campaignFail(code) {
  throw new Error(`MASSAGE_DAY_IMAGE_CAMPAIGN_${code}`);
}

async function externalJson(repositoryRoot, relativePath, code) {
  const bytes = await readFile(path.join(repositoryRoot, relativePath)).catch(() =>
    campaignFail(`${code}:MISSING:${relativePath}`),
  );
  try {
    return { bytes, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
  } catch {
    return campaignFail(`${code}:JSON:${relativePath}`);
  }
}

async function externalBytes(repositoryRoot, relativePath, code) {
  return readFile(path.join(repositoryRoot, relativePath)).catch(() =>
    campaignFail(`${code}:MISSING:${relativePath}`),
  );
}

async function imageFacts(bytes, code) {
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height || !metadata.format) campaignFail(`${code}:IMAGE_METADATA`);
  return { width: metadata.width, height: metadata.height, format: metadata.format };
}

async function collectRangReuse() {
  const repositoryRoot = SOURCE_REPOSITORIES.rang;
  const releaseRelative = "artifacts/image-release/rang-therapy-regional-release.v1.json";
  const release = await externalJson(repositoryRoot, releaseRelative, "RANG_RELEASE");
  if (
    release.value.schemaVersion !== "rang-therapy-regional-image-release-receipt/v1" ||
    release.value.status !== "ROOT_APPROVED_RELEASED" ||
    release.value.platformKey !== "rang-therapy"
  ) campaignFail("RANG_RELEASE:CONTRACT");
  const releasedSources = new Map(
    release.value.sourceAssets.map((entry) => [entry.assetId, entry]),
  );
  const entries = [];
  for (let number = 1; number <= 24; number += 1) {
    const sourceAssetId = `rng-rgn-${String(number).padStart(3, "0")}-c01`;
    const sourceRelease = releasedSources.get(sourceAssetId);
    if (!sourceRelease) campaignFail(`RANG_RELEASE:ASSET:${sourceAssetId}`);
    const provenanceRelative = `public/assets/rang-therapy/regional/${sourceAssetId}/provenance.json`;
    const provenance = await externalJson(repositoryRoot, provenanceRelative, "RANG_PROVENANCE");
    if (
      provenance.value.schemaVersion !== "rang-therapy-regional-image-provenance/v1" ||
      provenance.value.platformKey !== "rang-therapy" ||
      provenance.value.assetId !== sourceAssetId ||
      provenance.value.rootReview?.reviewer !== "root" ||
      provenance.value.rootReview?.sourceDecision !== "ACCEPT" ||
      sourceRelease.provenance !== provenanceRelative
    ) campaignFail(`RANG_PROVENANCE:CONTRACT:${sourceAssetId}`);
    const sourceRelative = `public/assets/rang-therapy/regional/${sourceAssetId}/desktop.webp`;
    const sourceBytes = await externalBytes(repositoryRoot, sourceRelative, "RANG_SOURCE");
    const sourceSha256 = sha256(sourceBytes);
    if (provenance.value.derivatives?.desktop?.sha256 !== sourceSha256) {
      campaignFail(`RANG_SOURCE:HASH:${sourceAssetId}`);
    }
    const facts = await imageFacts(sourceBytes, `RANG_SOURCE:${sourceAssetId}`);
    if (facts.width !== 1600 || facts.height !== 900 || facts.format !== "webp") {
      campaignFail(`RANG_SOURCE:DIMENSIONS:${sourceAssetId}`);
    }
    const assetId = regionalAssetId(number);
    const destinationRelative = `${MASTER_ROOT}/reused/${assetId}.webp`;
    await writeNewOrExact(destinationRelative, sourceBytes, "IMAGE_CAMPAIGN");
    entries.push({
      assetId,
      sourceClass: "reused",
      sourcePlatform: "rang-therapy",
      sourceAssetId,
      sourceRepository: "dearmykassy/rang-therapy",
      sourceRelative,
      sourceSha256,
      originalSourceSha256: provenance.value.source.sha256,
      copiedMaster: { relativePath: destinationRelative, sha256: sourceSha256, ...facts },
      authority: {
        releaseReceipt: { relativePath: releaseRelative, sha256: release.sha256 },
        sourceProvenance: { relativePath: provenanceRelative, sha256: provenance.sha256 },
        note: "The source campaign originals are not required here; the existing released derivative and ROOT_APPROVED_RELEASED receipt are the reuse authority.",
      },
    });
  }
  return entries;
}

async function collectGeonmaReuse() {
  const repositoryRoot = SOURCE_REPOSITORIES.geonma;
  const campaignRelative = "artifacts/image-campaign/geonma-template4-mirror-selfie-v1/campaign.v1.json";
  const reviewRelative = "artifacts/image-campaign/geonma-template4-mirror-selfie-v1/contact-sheets/round-01/review.v1.json";
  const [campaign, review] = await Promise.all([
    externalJson(repositoryRoot, campaignRelative, "GEONMA_CAMPAIGN"),
    externalJson(repositoryRoot, reviewRelative, "GEONMA_REVIEW"),
  ]);
  if (
    review.value.status !== "ROOT_APPROVED" ||
    review.value.reviewer !== "root" ||
    review.value.platform !== "geonmae-banhada" ||
    review.value.routeAssignmentAuthorized !== true ||
    review.value.campaignSha256 !== campaign.sha256
  ) campaignFail("GEONMA_REVIEW:CONTRACT");
  const decisions = new Map(review.value.assets.map((entry) => [entry.jobId, entry]));
  const entries = [];
  for (let offset = 0; offset < 24; offset += 1) {
    const sourceNumber = offset + 1;
    const sourceAssetId = `gmb-t4-rgn-${String(sourceNumber).padStart(3, "0")}-v1`;
    const provenanceRelative = `public/assets/geonmae-banhada/template4-regional/${sourceAssetId}/provenance.json`;
    const provenance = await externalJson(repositoryRoot, provenanceRelative, "GEONMA_PROVENANCE");
    const decision = decisions.get(sourceAssetId);
    if (
      provenance.value.assetId !== sourceAssetId ||
      provenance.value.platform !== "geonmae-banhada" ||
      provenance.value.campaign?.sha256 !== campaign.sha256 ||
      provenance.value.rootReview?.sha256 !== review.sha256 ||
      decision?.decision !== "ACCEPT"
    ) campaignFail(`GEONMA_PROVENANCE:CONTRACT:${sourceAssetId}`);
    const sourceRelative = provenance.value.source.relativePath;
    const sourceBytes = await externalBytes(repositoryRoot, sourceRelative, "GEONMA_SOURCE");
    const sourceSha256 = sha256(sourceBytes);
    if (sourceSha256 !== provenance.value.source.sha256 || decision.sourceSha256 !== sourceSha256) {
      campaignFail(`GEONMA_SOURCE:HASH:${sourceAssetId}`);
    }
    const facts = await imageFacts(sourceBytes, `GEONMA_SOURCE:${sourceAssetId}`);
    const assetId = regionalAssetId(25 + offset);
    const destinationRelative = `${MASTER_ROOT}/reused/${assetId}.png`;
    await writeNewOrExact(destinationRelative, sourceBytes, "IMAGE_CAMPAIGN");
    entries.push({
      assetId,
      sourceClass: "reused",
      sourcePlatform: "geonmae-banhada",
      sourceAssetId,
      sourceRepository: "dearmykassy/geonmae-banhada",
      sourceRelative,
      sourceSha256,
      copiedMaster: { relativePath: destinationRelative, sha256: sourceSha256, ...facts },
      authority: {
        campaign: { relativePath: campaignRelative, sha256: campaign.sha256 },
        rootReview: { relativePath: reviewRelative, sha256: review.sha256, reviewer: "root" },
        sourceProvenance: { relativePath: provenanceRelative, sha256: provenance.sha256 },
      },
    });
  }
  return entries;
}

async function collectHonhyeolReuse() {
  const repositoryRoot = SOURCE_REPOSITORIES.honhyeol;
  const reviewRelative = "artifacts/image-campaign/honhyeol-template4-mirror-selfie-v1/contact-sheets/round-02/review.v2.json";
  const review = await externalJson(repositoryRoot, reviewRelative, "HONHYEOL_REVIEW");
  if (
    review.value.status !== "ROOT_APPROVED" ||
    review.value.reviewer !== "root" ||
    review.value.platformKey !== "honhyeol-massage"
  ) campaignFail("HONHYEOL_REVIEW:CONTRACT");

  const candidateIds = [];
  for (let number = 1; number <= 130; number += 1) {
    const sourceAssetId = `hym-t4-rgn-${String(number).padStart(3, "0")}-v1`;
    const provenanceRelative = `public/assets/honhyeol-massage/template4-regional/${sourceAssetId}/provenance.json`;
    const provenanceBytes = await readFile(path.join(repositoryRoot, provenanceRelative));
    const provenance = JSON.parse(provenanceBytes.toString("utf8"));
    if (provenance.sourceClass === "replacement-new") candidateIds.push(sourceAssetId);
  }
  const selectedIds = candidateIds.slice(0, 24);
  if (candidateIds.length !== 66 || selectedIds.length !== 24) {
    campaignFail(`HONHYEOL_REPLACEMENT_COUNT:${candidateIds.length}`);
  }
  const entries = [];
  for (const [offset, sourceAssetId] of selectedIds.entries()) {
    const provenanceRelative = `public/assets/honhyeol-massage/template4-regional/${sourceAssetId}/provenance.json`;
    const provenance = await externalJson(repositoryRoot, provenanceRelative, "HONHYEOL_PROVENANCE");
    if (
      provenance.value.status !== "ROOT_APPROVED_RELEASED" ||
      provenance.value.platformKey !== "honhyeol-massage" ||
      provenance.value.assetId !== sourceAssetId ||
      provenance.value.sourceClass !== "replacement-new" ||
      provenance.value.authority?.rootReview?.sha256 !== review.sha256 ||
      provenance.value.authority?.rootReview?.reviewer !== "root"
    ) campaignFail(`HONHYEOL_PROVENANCE:CONTRACT:${sourceAssetId}`);
    const sourceRelative = provenance.value.source.relativePath;
    const sourceBytes = await externalBytes(repositoryRoot, sourceRelative, "HONHYEOL_SOURCE");
    const sourceSha256 = sha256(sourceBytes);
    if (sourceSha256 !== provenance.value.source.sha256) {
      campaignFail(`HONHYEOL_SOURCE:HASH:${sourceAssetId}`);
    }
    const facts = await imageFacts(sourceBytes, `HONHYEOL_SOURCE:${sourceAssetId}`);
    const assetId = regionalAssetId(49 + offset);
    const destinationRelative = `${MASTER_ROOT}/reused/${assetId}.png`;
    await writeNewOrExact(destinationRelative, sourceBytes, "IMAGE_CAMPAIGN");
    entries.push({
      assetId,
      sourceClass: "reused",
      sourcePlatform: "honhyeol-massage",
      sourceAssetId,
      sourceRepository: "dearmykassy/honhyeol-massage",
      sourceRelative,
      sourceSha256,
      copiedMaster: { relativePath: destinationRelative, sha256: sourceSha256, ...facts },
      authority: {
        rootReview: { relativePath: reviewRelative, sha256: review.sha256, reviewer: "root" },
        sourceProvenance: { relativePath: provenanceRelative, sha256: provenance.sha256 },
        sourceClassRequired: "replacement-new",
      },
    });
  }
  return entries;
}

const SETTINGS = [
  "a pale limestone urban dressing lounge with a broad wall mirror and one slim chrome console",
  "a bright white-oak fitting lounge with a clean plaster wall and one low upholstered stool",
  "a daylight hotel wardrobe vestibule with pale travertine and flush cabinetry",
  "a warm-white boutique dressing lounge with blush terrazzo and one floating shelf",
  "a calm city apartment dressing alcove with light oak, cream plaster, and uncluttered flooring",
  "a sunlit fashion studio lounge with soft gray stone, linen curtains, and no retail signage",
  "a bright reception dressing area with pale walnut panels and a simple neutral bench",
  "a daytime urban vanity lounge with matte ivory walls and a clean stone ledge",
  "a light-filled fitting salon with cream tile, brushed metal details, and no merchandise",
  "a contemporary dressing room with pale concrete, warm timber, and one plain stool",
  "a clean hotel dressing lounge with off-white cabinetry and a quiet city window",
  "a bright studio wardrobe corner with soft beige walls and a single low console",
];

const MIRRORS = [
  "a frameless full-height mirror with three crisp visible edges",
  "a full-outline capsule mirror in a slim satin-chrome frame",
  "a large rounded-rectangle mirror with all four corners visible",
  "a generous circular wall mirror with most of its fine metal outline visible",
  "a black-metal full-length floor mirror with three clear frame edges",
  "a wide panoramic dressing mirror with both side edges and the lower edge visible",
  "a floating rectangular mirror with a complete warm-white backlit outline",
  "a clean three-panel dressing mirror with both seams and the upper outline visible",
  "an asymmetric beveled mirror with a clearly traced perimeter",
  "a tall arched mirror with both sides and the curved top clearly visible",
  "a broad oval mirror with a narrow brushed-metal outline",
  "a rectangular vanity mirror with a clean full border and uninterrupted reflection",
];

const OUTFITS = [
  "a fully opaque dusty-rose long-sleeve knit with charcoal tailored trousers",
  "a modest ivory high-neck blouse with muted-plum wide-leg trousers",
  "a fully buttoned taupe cardigan over an opaque cream top with black straight trousers",
  "a charcoal mock-neck jersey top with a rose-beige midi skirt below the knee",
  "a muted-coral crew-neck knit with cream tailored trousers",
  "an opaque soft-gray blouse with deep-rose straight trousers",
  "a warm-beige long-sleeve knit with dark-brown tailored trousers",
  "a fully covered pale-pink shirt with charcoal wide-leg trousers",
  "an ivory mock-neck top with a muted-burgundy midi skirt below the knee",
  "a modest slate-blue blouse with cream straight trousers",
  "a rose-brown fine-knit cardigan fastened over an opaque top with black trousers",
  "a clean white long-sleeve blouse with plum tailored trousers",
];

const POSES = [
  "standing in a relaxed three-quarter pose, framed from mid-thigh upward, with the free hand naturally visible",
  "standing straight with relaxed shoulders, framed from the knees upward",
  "turning both shoulders a few degrees toward the mirror with a neutral closed-lip expression",
  "standing farther from the mirror in a restrained full-length fashion pose",
  "resting the free hand lightly near the plain console while keeping a composed posture",
  "seated upright on the simple backless dressing stool, never on a bed, framed from the waist upward",
  "standing at a slight diagonal and looking naturally at the phone screen",
  "standing beside the minimal stool with one arm relaxed along the body",
  "standing still in a natural just-before-the-photo moment rather than a playful pose",
  "taking a composed waist-up mirror portrait with the free hand resting at the side",
  "standing in a wider architectural composition that gives the mirror equal visual importance",
  "standing in a quiet side-facing posture and turning only the head toward the phone screen",
];

const HAIR = [
  "long softly waved dark hair with a clean center part",
  "long straight dark hair tucked behind one ear",
  "collarbone-length smooth dark hair with softly curved ends",
  "long dark hair worn down with a gentle side part",
  "long loose dark waves with natural volume",
  "long sleek dark hair in a low ponytail with soft face-framing strands",
  "shoulder-length dark hair tucked behind both ears",
  "long softly layered dark hair resting behind both shoulders",
];

const DAYLIGHT = [
  "clear late-morning daylight with soft window fill and natural skin texture",
  "bright overcast daylight with even exposure and restrained highlights",
  "gentle midday window light with realistic shadow falloff",
  "clean early-afternoon daylight with neutral white balance",
  "soft sun-filtered daylight through a sheer curtain with no dramatic color cast",
  "bright natural room light with believable reflected illumination",
];

function regionalPrompt(assetNumber) {
  const offset = assetNumber - 73;
  return [
    "Use case: photorealistic-natural",
    "Asset type: responsive regional website banner master",
    "Primary request: one polished but natural mirror selfie for the 마사지데이 regional guide",
    `Scene/backdrop: ${SETTINGS[offset % SETTINGS.length]}`,
    `Subject: one clearly adult Korean woman age 26-34, ${HAIR[(offset * 5) % HAIR.length]}, ${OUTFITS[(offset * 7) % OUTFITS.length]}`,
    `Style/medium: photorealistic contemporary Korean fashion editorial with real skin and fabric texture, variation ${String(offset + 1).padStart(3, "0")}`,
    `Composition/framing: ${POSES[(offset * 11) % POSES.length]}; ${MIRRORS[(offset * 5) % MIRRORS.length]}; landscape 16:9; keep her face, phone, torso, and mirror geometry inside the central crop-safe area for desktop, tablet, and mobile derivatives`,
    `Lighting/mood: ${DAYLIGHT[offset % DAYLIGHT.length]}; bright daytime, calm and matter-of-fact`,
    "Phone and face: hold one plain unbranded phone vertically beside the face; both eyes, nose, and mouth remain clearly visible and unobstructed; the phone must not cover the facial centerline",
    "Reflection contract: one physical adult and one coherent reflection only; anatomically correct hands and fingers; the phone, pose, room, and mirror perspective agree",
    "Constraints: fully opaque everyday clothing; nonsexual pose; no text; no signage; no logo; no watermark; no bed; no bathroom; no massage scene; no medical equipment",
    "Avoid: cleavage, lingerie, swimwear, crop tops, transparent fabric, fetish framing, bedroom framing, minor-looking subject, extra people, duplicate reflection, duplicate limbs, malformed hands, face hidden by phone, artificial plastic skin, copied public figure identity",
  ].join("\n");
}

const EDITORIALS = [
  {
    id: "mday-t6-editorial-home-hero-v1",
    slot: "home.hero",
    outputFile: `${EDITORIAL_MASTER_ROOT}/mday-t6-editorial-home-hero-v1.png`,
    activeOutput: "public/images/massage-day-template6/home/hero.webp",
    prompt: [
      "Use case: photorealistic-natural",
      "Asset type: 마사지데이 homepage hero banner",
      "Primary request: bright daytime urban dressing-lounge mirror selfie",
      "Scene/backdrop: pale limestone and warm-white dressing lounge with a large real mirror and no signage",
      "Subject: one clearly adult Korean woman age 26-34 in a fully opaque dusty-rose long-sleeve knit and charcoal tailored trousers",
      "Style/medium: photorealistic contemporary Korean fashion editorial with natural skin and fabric texture",
      "Composition/framing: landscape 16:9; woman and phone in the right-center safe area; preserve quiet low-detail space on the left for homepage copy; face, phone, torso, and mirror remain safe in narrower mobile crops",
      "Lighting/mood: clear late-morning daylight, neutral and calm",
      "Phone and face: one unbranded phone beside the face; both eyes, nose, and mouth fully visible",
      "Constraints: one person and one coherent reflection only; fully clothed; nonsexual; no text, logo, watermark, bed, bathroom, massage scene, or medical equipment",
      "Avoid: cleavage, lingerie, transparent fabric, minor-looking subject, extra people, duplicate reflection or limbs, malformed hands, hidden face, copied identity",
    ].join("\n"),
  },
  {
    id: "mday-t6-editorial-blog-01-v1",
    slot: "blog.note-01",
    outputFile: `${EDITORIAL_MASTER_ROOT}/mday-t6-editorial-blog-01-v1.png`,
    activeOutput: "public/images/massage-day-template6/blog/note-01.webp",
    prompt: [
      "Use case: photorealistic-natural",
      "Asset type: 마사지데이 blog header banner",
      "Primary request: daytime mirror selfie suitable for an article about preparing an address and schedule before calling",
      "Scene/backdrop: light-oak urban dressing lounge with one plain console and a large capsule mirror",
      "Subject: one clearly adult Korean woman age 26-34 in a modest ivory blouse and muted-plum tailored trousers",
      "Style/medium: photorealistic Korean fashion editorial, natural skin and fabric texture",
      "Composition/framing: landscape 16:9; waist-up to mid-thigh; face and phone near center; quiet side space for page layout; crop-safe on mobile",
      "Lighting/mood: bright soft daylight, practical and calm",
      "Phone and face: plain unbranded phone beside one cheek; eyes, nose, and mouth fully visible",
      "Constraints: one person and one coherent reflection only; fully opaque clothing; nonsexual; no legible notes, text, logo, watermark, bed, bathroom, or massage scene",
      "Avoid: cleavage, lingerie, transparent fabric, minor-looking subject, extra people, duplicate reflection or limbs, malformed hands, hidden face, copied identity",
    ].join("\n"),
  },
  {
    id: "mday-t6-editorial-blog-02-v1",
    slot: "blog.note-02",
    outputFile: `${EDITORIAL_MASTER_ROOT}/mday-t6-editorial-blog-02-v1.png`,
    activeOutput: "public/images/massage-day-template6/blog/note-02.webp",
    prompt: [
      "Use case: photorealistic-natural",
      "Asset type: 마사지데이 blog header banner",
      "Primary request: bright urban dressing-lounge mirror selfie suitable for an article about comparing course time and payment details",
      "Scene/backdrop: pale travertine wardrobe lounge with clean off-white cabinetry and a broad rounded-rectangle mirror",
      "Subject: one clearly adult Korean woman age 26-34 in a fully buttoned taupe cardigan, opaque cream top, and black straight trousers",
      "Style/medium: photorealistic contemporary Korean fashion editorial with realistic skin and material texture",
      "Composition/framing: landscape 16:9; composed knee-up pose; face and phone in the central crop-safe zone; retain clear negative space for responsive page layout",
      "Lighting/mood: gentle early-afternoon daylight, neutral and composed",
      "Phone and face: one unbranded phone held beside the face; both eyes, nose, and mouth fully visible",
      "Constraints: one person and one coherent reflection only; fully opaque clothing; nonsexual; no text, logo, watermark, bed, bathroom, massage scene, or medical equipment",
      "Avoid: cleavage, lingerie, transparent fabric, minor-looking subject, extra people, duplicate reflection or limbs, malformed hands, hidden face, copied identity",
    ].join("\n"),
  },
];

function buildJob({ id, jobClass, outputFile, activeOutput, prompt }) {
  const promptFile = `${CAMPAIGN_ROOT}/prompts/${id}.txt`;
  return {
    schemaVersion: JOB_SCHEMA,
    id,
    assetId: id,
    jobClass,
    sourceClass: "new",
    generationMode: "built-in-imagegen",
    executionContract: {
      callsRequired: 1,
      callsSubmitted: 0,
      variantsPerCall: 1,
      noBatchSubstitution: true,
      note: "Run one built-in image_gen call for this prompt. Do not use a CLI/API fallback unless the owner explicitly changes the mode.",
    },
    prompt,
    promptFile,
    promptSha256: createHash("sha256").update(`${prompt}\n`).digest("hex"),
    outputFile,
    activeOutput,
    generationStatus: "NOT_GENERATED",
    approvalStatus: "NOT_REVIEWED",
    releaseStatus: "NOT_RELEASED",
    qaContract: {
      adultKoreanWomanAge26To34: true,
      brightDaytimeUrbanDressingLounge: true,
      faceVisibleBesidePhone: true,
      nonsexualFullyOpaqueClothing: true,
      coherentSingleReflection: true,
      responsiveCropSafe: true,
      forbiddenTextLogoWatermark: true,
      forbiddenMinorOrMalformedOrDuplicatePerson: true,
      ownerExceptionAllowed: false,
    },
  };
}

export function buildGenerationJobs() {
  const regional = Array.from({ length: EXPECTED.newAssets }, (_, index) => {
    const number = 73 + index;
    const id = regionalAssetId(number);
    return buildJob({
      id,
      jobClass: "regional",
      outputFile: `${MASTER_ROOT}/generated/${id}.png`,
      activeOutput: null,
      prompt: regionalPrompt(number),
    });
  });
  const editorial = EDITORIALS.map((entry) => buildJob({ ...entry, jobClass: "editorial" }));
  return [...regional, ...editorial];
}

export async function buildCampaign() {
  const [rang, geonma, honhyeol, nodes] = await Promise.all([
    collectRangReuse(),
    collectGeonmaReuse(),
    collectHonhyeolReuse(),
    buildRegionNodes(),
  ]);
  const reused = [...rang, ...geonma, ...honhyeol];
  if (
    reused.length !== EXPECTED.reusedAssets ||
    new Set(reused.map((entry) => entry.assetId)).size !== EXPECTED.reusedAssets ||
    new Set(reused.map((entry) => entry.sourceSha256)).size !== EXPECTED.reusedAssets
  ) campaignFail("REUSED_UNIQUENESS");
  const assets = buildAssetDefinitions();
  const assignment = buildAssignments(nodes, assets);
  const focal = proposedFocalDocument(assets);
  const focalBytes = jsonBytes(focal);
  const assignmentDocument = plannedAssignmentDocument(
    nodes,
    assets,
    assignment,
    sha256(focalBytes),
  );
  const jobs = buildGenerationJobs();
  if (
    jobs.length !== EXPECTED.newAssets + EXPECTED.editorials ||
    new Set(jobs.map((job) => job.id)).size !== jobs.length ||
    new Set(jobs.map((job) => job.prompt)).size !== jobs.length
  ) campaignFail("JOB_UNIQUENESS");

  const reuseDocument = {
    schemaVersion: "massage-day-template6-reused-assets/v1",
    status: "COPIED_BYTE_EXACT_AWAITING_MASSAGE_DAY_ROOT_REVIEW",
    platformKey: "massage-day",
    reuseAuthority: {
      type: "explicit-owner-authorization",
      grantedDateKst: "2026-08-18",
      scope: "Approximately one third of the 마사지데이 regional image assignments may reuse previously approved platform photographs.",
    },
    distribution: { rangTherapy: 24, geonmaeBanhada: 24, honhyeolReplacementNew: 24, total: 72 },
    assets: reused,
  };
  const reuseBytes = jsonBytes(reuseDocument);
  const campaign = {
    schemaVersion: CAMPAIGN_SCHEMA,
    campaignKey: CAMPAIGN_KEY,
    status: "SCAFFOLDED_AWAITING_144_REGIONAL_AND_3_EDITORIAL_GENERATIONS",
    platform: { name: "마사지데이", platformKey: "massage-day", template: "Template6" },
    counts: {
      regionalMasters: EXPECTED.assets,
      reusedRegionalMasters: EXPECTED.reusedAssets,
      newRegionalMasters: EXPECTED.newAssets,
      editorialMasters: EXPECTED.editorials,
      generationJobs: jobs.length,
    },
    reuseProvenance: { relativePath: REUSE_PATH, sha256: sha256(reuseBytes) },
    assignmentPlan: {
      relativePath: ASSIGNMENT_PATH,
      seed: assignment.seed,
      distribution: assignmentDocument.distribution,
    },
    focalPlan: { relativePath: FOCAL_PATH, sha256: sha256(focalBytes), status: focal.status },
    generationPolicy: {
      mode: "built-in-imagegen",
      callsPerNewMaster: 1,
      regionalCalls: 144,
      editorialCalls: 3,
      totalCalls: 147,
      currentCallsSubmitted: 0,
      cliFallbackAuthorized: false,
      preserveRejectedAndFailedAttempts: true,
    },
    visualContract: {
      useCase: "photorealistic-natural",
      setting: "bright daytime urban dressing lounge",
      subject: "one clearly adult Korean woman age 26-34",
      phoneAndFace: "phone beside the face; both eyes, nose, and mouth visible",
      safety: "fully opaque clothing, nonsexual pose, no minor-looking subject, text, logo, watermark, malformed anatomy, extra person, or duplicate reflection",
      crop: "desktop 1600x900, tablet 1200x675, mobile 768x600 after root-approved focal review",
    },
    jobs: jobs.map((job) => ({
      id: job.id,
      jobClass: job.jobClass,
      promptFile: job.promptFile,
      promptSha256: job.promptSha256,
      jobFile: `${CAMPAIGN_ROOT}/jobs/${job.id}.json`,
      outputFile: job.outputFile,
      activeOutput: job.activeOutput,
    })),
  };
  return {
    campaign,
    campaignBytes: jsonBytes(campaign),
    reuseDocument,
    reuseBytes,
    focal,
    focalBytes,
    assignmentDocument,
    assignmentBytes: jsonBytes(assignmentDocument),
    jobs,
    reused,
  };
}

export async function writeCampaign(built) {
  const campaignBuild = built ?? await buildCampaign();
  const results = [];
  for (const job of campaignBuild.jobs) {
    results.push(await writeNewOrExact(job.promptFile, Buffer.from(`${job.prompt}\n`), "IMAGE_CAMPAIGN"));
    results.push(await writeNewOrExact(`${CAMPAIGN_ROOT}/jobs/${job.id}.json`, jsonBytes(job), "IMAGE_CAMPAIGN"));
  }
  results.push(await writeNewOrExact(REUSE_PATH, campaignBuild.reuseBytes, "IMAGE_CAMPAIGN"));
  results.push(await writeNewOrExact(FOCAL_PATH, campaignBuild.focalBytes, "IMAGE_CAMPAIGN"));
  results.push(await writeNewOrExact(ASSIGNMENT_PATH, campaignBuild.assignmentBytes, "IMAGE_CAMPAIGN"));
  results.push(await writeNewOrExact(CAMPAIGN_PATH, campaignBuild.campaignBytes, "IMAGE_CAMPAIGN"));

  const inventory = {
    schemaVersion: "massage-day-template6-contact-sheet-inventory/v1",
    status: "AWAITING_144_REGIONAL_AND_3_EDITORIAL_GENERATIONS",
    platformKey: "massage-day",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: sha256(campaignBuild.campaignBytes) },
    counts: { readyReusedRegional: 72, missingNewRegional: 144, missingEditorial: 3, totalRegional: 216 },
    regional: [
      ...campaignBuild.reused.map((entry) => ({
        assetId: entry.assetId,
        sourceClass: "reused",
        status: "COPIED_SOURCE_APPROVED_AWAITING_MASSAGE_DAY_ROOT_REVIEW",
        relativePath: entry.copiedMaster.relativePath,
        sha256: entry.copiedMaster.sha256,
        width: entry.copiedMaster.width,
        height: entry.copiedMaster.height,
        format: entry.copiedMaster.format,
      })),
      ...campaignBuild.jobs.filter((job) => job.jobClass === "regional").map((job) => ({
        assetId: job.assetId,
        sourceClass: "new",
        status: "MISSING_AWAITING_ONE_BUILT_IN_IMAGEGEN_CALL",
        relativePath: job.outputFile,
        promptSha256: job.promptSha256,
      })),
    ],
    editorial: campaignBuild.jobs.filter((job) => job.jobClass === "editorial").map((job) => ({
      assetId: job.assetId,
      status: "MISSING_AWAITING_ONE_BUILT_IN_IMAGEGEN_CALL",
      relativePath: job.outputFile,
      activeOutput: job.activeOutput,
      promptSha256: job.promptSha256,
    })),
  };
  const contactSheets = {
    schemaVersion: "massage-day-template6-contact-sheets/v1",
    status: "NOT_CREATED_GENERATED_MASTERS_MISSING",
    platformKey: "massage-day",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: sha256(campaignBuild.campaignBytes) },
    expected: { regionalSheets: 18, assetsPerRegionalSheet: 12, editorialSheets: 1 },
    sheets: [],
  };
  const reviewExample = {
    schemaVersion: "massage-day-template6-root-review-input/v1",
    status: "PENDING_MANUAL_ROOT_VISUAL_REVIEW",
    platformKey: "massage-day",
    reviewer: "root",
    campaign: { relativePath: CAMPAIGN_PATH, sha256: sha256(campaignBuild.campaignBytes) },
    inventory: { relativePath: INVENTORY_PATH, sha256: "REPLACE_WITH_READY_INVENTORY_SHA256" },
    contactSheets: { relativePath: CONTACT_SHEET_MANIFEST_PATH, sha256: "REPLACE_WITH_READY_CONTACT_SHEET_MANIFEST_SHA256" },
    focalPoints: { relativePath: FOCAL_PATH, sha256: sha256(campaignBuild.focalBytes), responsiveCropsAuthorized: false },
    regionalAssetsAccepted: [],
    editorialAssetsAccepted: [],
    rejectedAssets: [],
    routeAssignmentAuthorized: false,
    signedAt: null,
    note: "This example is not an approval. Root must inspect the finished contact sheets and create root-review.input.v1.json with exact hashes and all decisions.",
  };
  results.push(await writeNewOrExact(INVENTORY_PATH, jsonBytes(inventory), "IMAGE_CAMPAIGN"));
  results.push(await writeNewOrExact(CONTACT_SHEET_MANIFEST_PATH, jsonBytes(contactSheets), "IMAGE_CAMPAIGN"));
  results.push(await writeNewOrExact(`${CAMPAIGN_ROOT}/reviews/root-review.input.example.json`, jsonBytes(reviewExample), "IMAGE_CAMPAIGN"));
  if (ROOT_REVIEW_INPUT_PATH.endsWith(".example.json")) campaignFail("ROOT_REVIEW_INPUT_PATH");

  return {
    created: results.filter((result) => result === "created").length,
    exact: results.filter((result) => result === "exact").length,
    documents: results.length,
    jobs: campaignBuild.jobs.length,
    reusedMasters: campaignBuild.reused.length,
    assignmentSeed: campaignBuild.assignmentDocument.assignmentSeed,
  };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  const result = await writeCampaign();
  console.log(JSON.stringify({ status: "SCAFFOLDED", ...result }, null, 2));
}
