import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createContactSheets } from "../scripts/create-massage-day-contact-sheets.mjs";
import { createRootReviewReceipt } from "../scripts/create-massage-day-root-review.mjs";
import {
  ACTIVE_ROOT_KEYS,
  ASSIGNMENT_PATH,
  CONTACT_SHEET_MANIFEST_PATH,
  DERIVATIVE_PROFILES,
  EXPECTED,
  FOCAL_PATH,
  HOME_REGION_ROOT,
  INVENTORY_PATH,
  MASTER_ROOT,
  PROJECT_ROOT,
  RELEASE_RECEIPT_PATH,
  RELEASE_ROOT,
  REPLACEMENT_SELECTION_PATH,
  REUSE_SUBSTITUTION_PATH,
  ROOT_REVIEW_INPUT_PATH,
  ROOT_REVIEW_RECEIPT_PATH,
  buildAssetDefinitions,
  buildRegionNodes,
  sha256,
  verifyAssignment,
} from "../scripts/lib/massage-day-image-common.mjs";
import { releaseTemplate6Images } from "../scripts/release-template6-regional-images.mjs";

const AUTHORING_INPUTS_AVAILABLE = existsSync(path.join(PROJECT_ROOT, MASTER_ROOT));

const AUTHORITY_SHA256 = Object.freeze({
  campaign: "2cf8705049bd4856b2ac60f0509615cd1d7f43227e390abb4e62798d25bff160",
  contactSheets: "5ce4bd95e6e9b31549b9ae8e48aac1d31bed6c21db1038afd45dc90a4d716177",
  focal: "5fb69d5679502bed1018c8d789ffe16912fce3d6827cc5a22c69acf9718f12ae",
  inventory: "b484f3218df01bc649c14f3e5b0dc7e80247f8ebd22a1dd279de7f1ffa24ea8c",
  replacement: "6fafe6ff3d1e6ad40c9062db6cb0e4cb8303ab4f6c646548648412d071f754f8",
  reuseSubstitution: "10d7d9e4bba3e691bddae3b5d1c706ac0fab582e29649c7ee59d1f7b0838dbea",
  rootInput: "88f006f677344b3e8fa0ea82484d213eaef20c3cfff744b7d4c125d4da5cb558",
  rootReceipt: "6f6f49894982d8b159b1596c62b5bd06747613d0bf75f59599858f329de663f4",
  releaseReceipt: "afe693bc10c6aac19e240175ccce2257d5bd66eff6e2eec11af59544ea7bcbcb",
});

async function bytesAt(relativePath) {
  return readFile(path.join(PROJECT_ROOT, relativePath));
}

async function jsonAt(relativePath) {
  const bytes = await bytesAt(relativePath);
  return { bytes, sha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
}

function assetNumber(assetId) {
  return Number(assetId.match(/-rgn-(\d{3})-v1$/u)?.[1]);
}

describe("마사지데이 image release gates", () => {
  it("still requires the explicit root approval flag", async () => {
    await expect(createRootReviewReceipt()).rejects.toThrow(
      "MASSAGE_DAY_ROOT_REVIEW_EXPLICIT_APPROVAL_FLAG_REQUIRED",
    );
  });

  it.skipIf(!AUTHORING_INPUTS_AVAILABLE)("replays contact, root approval, and final release idempotently", async () => {
    await expect(createContactSheets()).resolves.toEqual({
      status: "READY_FOR_ROOT_VISUAL_REVIEW",
      regional: EXPECTED.assets,
      editorial: EXPECTED.editorials,
      sheets: 19,
    });

    const rootReceipt = await createRootReviewReceipt({ approvalFlag: true });
    expect(rootReceipt).toMatchObject({
      status: "ROOT_APPROVED",
      reviewer: "root",
      sha256: AUTHORITY_SHA256.rootReceipt,
      decisions: {
        regionalAccepted: EXPECTED.assets,
        editorialAccepted: EXPECTED.editorials,
        rejected: 0,
        routeAssignmentAuthorized: true,
      },
    });

    await expect(releaseTemplate6Images()).resolves.toEqual({
      status: "ROOT_APPROVED_RELEASED",
      regional: EXPECTED.assets,
      homeRegions: ACTIVE_ROOT_KEYS.length,
      editorials: EXPECTED.editorials,
    });
  }, 600_000);

  it("binds the final substitutions, replacements, focal points, and release authority", async () => {
    const [
      assignment,
      focal,
      inventory,
      replacement,
      reuseSubstitution,
      rootInput,
      rootReceipt,
      releaseReceipt,
      contactSheets,
    ] = await Promise.all([
      jsonAt(ASSIGNMENT_PATH),
      jsonAt(FOCAL_PATH),
      jsonAt(INVENTORY_PATH),
      jsonAt(REPLACEMENT_SELECTION_PATH),
      jsonAt(REUSE_SUBSTITUTION_PATH),
      jsonAt(ROOT_REVIEW_INPUT_PATH),
      jsonAt(ROOT_REVIEW_RECEIPT_PATH),
      jsonAt(RELEASE_RECEIPT_PATH),
      jsonAt(CONTACT_SHEET_MANIFEST_PATH),
    ]);

    expect({
      campaign: rootReceipt.value.campaign.sha256,
      contactSheets: contactSheets.sha256,
      focal: focal.sha256,
      inventory: inventory.sha256,
      replacement: replacement.sha256,
      reuseSubstitution: reuseSubstitution.sha256,
      rootInput: rootInput.sha256,
      rootReceipt: rootReceipt.sha256,
      releaseReceipt: releaseReceipt.sha256,
    }).toEqual(AUTHORITY_SHA256);
    expect(rootReceipt.value).toMatchObject({
      status: "ROOT_APPROVED",
      reviewer: "root",
      campaign: { sha256: AUTHORITY_SHA256.campaign },
      inventory: { sha256: AUTHORITY_SHA256.inventory },
      contactSheets: { sha256: AUTHORITY_SHA256.contactSheets },
      focalPoints: { sha256: AUTHORITY_SHA256.focal, responsiveCropsAuthorized: true },
      replacementSelection: { sha256: AUTHORITY_SHA256.replacement, count: 27 },
      reuseSubstitution: { sha256: AUTHORITY_SHA256.reuseSubstitution, count: 24 },
      rootReviewInput: { sha256: AUTHORITY_SHA256.rootInput },
    });
    expect(releaseReceipt.value).toMatchObject({
      status: "ROOT_APPROVED_RELEASED",
      rootReview: { sha256: AUTHORITY_SHA256.rootReceipt },
      replacementSelection: { sha256: AUTHORITY_SHA256.replacement, count: 27 },
      reuseSubstitution: { sha256: AUTHORITY_SHA256.reuseSubstitution, count: 24 },
      distribution: {
        routes: EXPECTED.routes,
        reusedRoutes: EXPECTED.reusedRoutes,
        newRoutes: EXPECTED.newRoutes,
        maxUses: EXPECTED.maxUses,
        parentChildCollisions: 0,
        siblingCollisions: 0,
      },
    });
    expect(releaseReceipt.value.assignment.sha256).toBe(assignment.sha256);

    expect(replacement.value).toMatchObject({
      status: "READY_FOR_ROOT_VISUAL_REVIEW",
      counts: { rejectedV1: 27, selectedV2: 13, selectedV3: 13, selectedV4: 1 },
    });
    expect(replacement.value.replacements).toHaveLength(27);
    const selectedVersionCounts = replacement.value.replacements.reduce((counts, entry) => {
      const version = entry.selectedAssetId.match(/-v([234])$/u)?.[1];
      counts[version] = (counts[version] ?? 0) + 1;
      return counts;
    }, {});
    expect(selectedVersionCounts).toEqual({ 2: 13, 3: 13, 4: 1 });

    expect(reuseSubstitution.value).toMatchObject({
      status: "READY_FOR_ROOT_VISUAL_REVIEW",
      counts: { substituted: 24, accepted: 24, rejected: 0 },
      existingOriginalsPreserved: true,
    });
    expect(reuseSubstitution.value.substitutions).toHaveLength(24);
    expect(reuseSubstitution.value.substitutions.every(
      (entry) => entry.selectedSourcePlatform === "feeling-hometai" && entry.decision === "ACCEPT",
    )).toBe(true);
    expect(reuseSubstitution.value.substitutions.map((entry) => entry.logicalAssetId)).toEqual(
      buildAssetDefinitions().slice(0, 24).map((entry) => entry.assetId),
    );

    expect(Object.keys(focal.value.points)).toHaveLength(EXPECTED.assets);
    const first24Focal = buildAssetDefinitions().slice(0, 24).map(
      ({ assetId }) => focal.value.points[assetId],
    );
    expect(first24Focal.every(
      (point) => point.xPermille !== 500 && point.yPermille === 500,
    )).toBe(true);
    expect(assignment.value).toMatchObject({
      status: "ROOT_APPROVED_RELEASED",
      focalCropMetadata: {
        sha256: AUTHORITY_SHA256.focal,
        status: "ROOT_APPROVED",
        responsiveCropsAuthorized: true,
      },
      rootReview: { sha256: AUTHORITY_SHA256.rootReceipt, reviewer: "root" },
    });

    const nodes = await buildRegionNodes();
    const audit = verifyAssignment(nodes, buildAssetDefinitions(), assignment.value.routes);
    expect(Object.keys(assignment.value.routes)).toHaveLength(EXPECTED.routes);
    expect(audit).toMatchObject({
      reusedRoutes: EXPECTED.reusedRoutes,
      newRoutes: EXPECTED.newRoutes,
      parentChildCollisions: 0,
      siblingCollisions: 0,
    });
    expect(Math.max(...audit.usage.values())).toBe(EXPECTED.maxUses);
  });

  it("contains all hash-bound public regional, home, and editorial derivatives", async () => {
    const [releaseReceipt, inventory] = await Promise.all([
      jsonAt(RELEASE_RECEIPT_PATH),
      jsonAt(INVENTORY_PATH),
    ]);
    const releasedById = new Map(
      releaseReceipt.value.releasedAssets.map((entry) => [entry.assetId, entry]),
    );
    const inventoryById = new Map(inventory.value.regional.map((entry) => [entry.assetId, entry]));
    const expectedIds = buildAssetDefinitions().map((entry) => entry.assetId);
    const regionalDirectories = (await readdir(path.join(PROJECT_ROOT, RELEASE_ROOT), {
      withFileTypes: true,
    }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(regionalDirectories).toEqual(expectedIds);
    expect(releasedById.size).toBe(EXPECTED.assets);

    let webpCount = 0;
    let provenanceCount = 0;
    let reusedCount = 0;
    let newCount = 0;
    let feelingSubstitutionCount = 0;
    let replacementAuthorityCount = 0;

    for (const assetId of regionalDirectories) {
      const directory = path.join(PROJECT_ROOT, RELEASE_ROOT, assetId);
      expect((await readdir(directory)).sort()).toEqual([
        "desktop.webp",
        "mobile.webp",
        "provenance.json",
        "tablet.webp",
      ]);
      const provenance = await jsonAt(`${RELEASE_ROOT}/${assetId}/provenance.json`);
      provenanceCount += 1;
      expect(provenance.value).toMatchObject({
        status: "ROOT_APPROVED_RELEASED",
        assetId,
        rootReview: {
          sha256: AUTHORITY_SHA256.rootReceipt,
          reviewer: "root",
          sourceDecision: "ACCEPT",
          responsiveCropsAuthorized: true,
        },
        focalPoint: { source: { sha256: AUTHORITY_SHA256.focal } },
      });
      expect(releasedById.get(assetId)?.provenance).toEqual({
        relativePath: `${RELEASE_ROOT}/${assetId}/provenance.json`,
        sha256: provenance.sha256,
      });
      expect(provenance.value.source.sha256).toBe(inventoryById.get(assetId)?.sha256);

      if (provenance.value.sourceClass === "reused") reusedCount += 1;
      else if (provenance.value.sourceClass === "new") newCount += 1;

      if (assetNumber(assetId) <= 24) {
        feelingSubstitutionCount += 1;
        expect(provenance.value.source.reuseAuthority).toMatchObject({
          relativePath: REUSE_SUBSTITUTION_PATH,
          sha256: AUTHORITY_SHA256.reuseSubstitution,
          source: {
            relativePath: expect.stringMatching(/^public\/assets\/feeling-hometai\//u),
          },
          reason: "MIRROR_SELFIE_CONCEPT_ALIGNMENT",
        });
      }
      if (provenance.value.source.replacementAuthority) {
        replacementAuthorityCount += 1;
        expect(provenance.value.source.replacementAuthority).toMatchObject({
          relativePath: REPLACEMENT_SELECTION_PATH,
          sha256: AUTHORITY_SHA256.replacement,
        });
      }

      for (const [profileName, expectedProfile] of Object.entries(DERIVATIVE_PROFILES)) {
        const derivative = provenance.value.derivatives[profileName];
        const derivativeBytes = await bytesAt(derivative.relativePath);
        const metadata = await sharp(derivativeBytes).metadata();
        webpCount += 1;
        expect(sha256(derivativeBytes)).toBe(derivative.sha256);
        expect({ width: metadata.width, height: metadata.height, format: metadata.format }).toEqual({
          ...expectedProfile,
          format: "webp",
        });
      }
    }

    expect({
      directories: regionalDirectories.length,
      webpCount,
      provenanceCount,
      reusedCount,
      newCount,
      feelingSubstitutionCount,
      replacementAuthorityCount,
    }).toEqual({
      directories: 216,
      webpCount: 648,
      provenanceCount: 216,
      reusedCount: 72,
      newCount: 144,
      feelingSubstitutionCount: 24,
      replacementAuthorityCount: 27,
    });

    const homeFiles = (await readdir(path.join(PROJECT_ROOT, HOME_REGION_ROOT))).sort();
    expect(homeFiles).toEqual(ACTIVE_ROOT_KEYS.map((key) => `${key}.webp`).sort());
    expect(releaseReceipt.value.homeRegions).toHaveLength(11);
    for (const entry of releaseReceipt.value.homeRegions) {
      const bytes = await bytesAt(entry.relativePath);
      const metadata = await sharp(bytes).metadata();
      expect(sha256(bytes)).toBe(entry.sha256);
      expect({ width: metadata.width, height: metadata.height, format: metadata.format }).toEqual({
        width: 720,
        height: 720,
        format: "webp",
      });
    }

    expect(releaseReceipt.value.editorials).toHaveLength(3);
    expect(releaseReceipt.value.editorials.map((entry) => entry.relativePath).sort()).toEqual([
      "public/images/massage-day-template6/blog/note-01.webp",
      "public/images/massage-day-template6/blog/note-02.webp",
      "public/images/massage-day-template6/home/hero.webp",
    ]);
    for (const entry of releaseReceipt.value.editorials) {
      const bytes = await bytesAt(entry.relativePath);
      const metadata = await sharp(bytes).metadata();
      expect(sha256(bytes)).toBe(entry.sha256);
      expect({ width: metadata.width, height: metadata.height, format: metadata.format }).toEqual({
        width: 1600,
        height: 900,
        format: "webp",
      });
    }
  });
});
