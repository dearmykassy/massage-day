import { describe, expect, it } from "vitest";
import { buildGenerationJobs } from "../scripts/create-massage-day-image-campaign.mjs";
import {
  ASSIGNMENT_PATH,
  CAMPAIGN_PATH,
  EXPECTED,
  REUSE_PATH,
  buildAssetDefinitions,
  buildRegionNodes,
  jsonBytes,
  readJson,
  verifyAssignment,
} from "../scripts/lib/massage-day-image-common.mjs";

describe("마사지데이 Template6 image campaign", () => {
  it("keeps the fixed 144 regional and three editorial one-call jobs", () => {
    const jobs = buildGenerationJobs();
    const regional = jobs.filter((job) => job.jobClass === "regional");
    const editorial = jobs.filter((job) => job.jobClass === "editorial");
    expect(regional).toHaveLength(144);
    expect(editorial).toHaveLength(3);
    expect(regional[0].id).toBe("mday-t6-rgn-073-v1");
    expect(regional.at(-1).id).toBe("mday-t6-rgn-216-v1");
    expect(new Set(jobs.map((job) => job.id)).size).toBe(147);
    expect(new Set(jobs.map((job) => job.prompt)).size).toBe(147);
    for (const job of jobs) {
      expect(job.executionContract).toMatchObject({
        callsRequired: 1,
        callsSubmitted: 0,
        variantsPerCall: 1,
        noBatchSubstitution: true,
      });
      expect(job.generationMode).toBe("built-in-imagegen");
      expect(job.prompt).toMatch(/adult Korean woman age 26-34/u);
      expect(job.prompt).toMatch(/face|eyes/u);
      expect(job.prompt).toMatch(/nonsexual/u);
      expect(job.prompt).toMatch(/opaque/u);
      expect(job.prompt).not.toMatch(/lingerie as the requested outfit|minor subject/u);
    }
  });

  it("preserves the checked-in original 24/24/24 reuse plan as immutable history", async () => {
    const [campaign, reuse] = await Promise.all([
      readJson(CAMPAIGN_PATH, "TEST"),
      readJson(REUSE_PATH, "TEST"),
    ]);
    expect(campaign.value).toMatchObject({
      status: "SCAFFOLDED_AWAITING_144_REGIONAL_AND_3_EDITORIAL_GENERATIONS",
      counts: { reusedRegionalMasters: 72, newRegionalMasters: 144 },
      reuseProvenance: { relativePath: REUSE_PATH },
    });
    expect(reuse.value.assets).toHaveLength(72);
    expect(new Set(reuse.value.assets.map((entry) => entry.sourceSha256)).size).toBe(72);
    expect(reuse.value.assets.filter((entry) => entry.sourcePlatform === "rang-therapy")).toHaveLength(24);
    expect(reuse.value.assets.filter((entry) => entry.sourcePlatform === "geonmae-banhada")).toHaveLength(24);
    expect(reuse.value.assets.filter((entry) => entry.sourcePlatform === "honhyeol-massage")).toHaveLength(24);
    expect(reuse.value.assets.filter((entry) => entry.sourcePlatform === "honhyeol-massage").every(
      (entry) => entry.authority.sourceClassRequired === "replacement-new",
    )).toBe(true);
    expect(reuse.value.status).toBe("COPIED_BYTE_EXACT_AWAITING_MASSAGE_DAY_ROOT_REVIEW");
    expect(jsonBytes(campaign.value)).toEqual(campaign.bytes);
    expect(jsonBytes(reuse.value)).toEqual(reuse.bytes);
  });

  it("assigns exactly 1,291 routes with the mandated usage and zero local collisions", async () => {
    const [nodes, manifest] = await Promise.all([
      buildRegionNodes(),
      readJson(ASSIGNMENT_PATH, "TEST"),
    ]);
    const audit = verifyAssignment(nodes, buildAssetDefinitions(), manifest.value.routes);
    expect(manifest.value.status).toBe("ROOT_APPROVED_RELEASED");
    expect(manifest.value.distribution).toMatchObject({
      routes: EXPECTED.routes,
      assets: EXPECTED.assets,
      reusedRoutes: 430,
      newRoutes: 861,
      maxUses: 6,
      parentChildCollisions: 0,
      siblingCollisions: 0,
    });
    expect(audit.reusedRoutes).toBe(430);
    expect(audit.newRoutes).toBe(861);
    expect(audit.parentChildCollisions).toBe(0);
    expect(audit.siblingCollisions).toBe(0);
    expect(Math.max(...audit.usage.values())).toBe(6);
    expect([...audit.usage.values()].filter((uses) => uses === 6)).toHaveLength(214);
    expect([...audit.usage.values()].filter((uses) => uses === 4)).toHaveLength(1);
    expect([...audit.usage.values()].filter((uses) => uses === 3)).toHaveLength(1);
    expect(nodes.filter((node) => node.broad)).toHaveLength(41);
    expect(nodes.filter((node) => node.broad).every(
      (node) => manifest.value.routes[node.path].sourceClass === "new",
    )).toBe(true);
    expect(jsonBytes(manifest.value)).toEqual(manifest.bytes);
  });
});
