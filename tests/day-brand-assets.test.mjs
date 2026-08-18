import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createBrandAssets } from "../scripts/create-massage-day-brand-assets.mjs";
import { BRAND_ROOT, PROJECT_ROOT, readJson, sha256 } from "../scripts/lib/massage-day-image-common.mjs";

describe("마사지데이 day mark", () => {
  it("uses a transparent code-authored sun motif with three exact PNG derivatives", async () => {
    const result = await createBrandAssets();
    expect(result.status).toBe("CODE_AUTHORED_DERIVED");
    expect(result.generation.imageGenerationCalls).toBe(0);
    expect(result.motif).toMatch(/sunrise/u);
    expect(result.distinction).toMatch(/No heart and no orbit/u);
    const svg = await readFile(path.join(PROJECT_ROOT, `${BRAND_ROOT}/day-mark.svg`), "utf8");
    expect(svg).not.toContain("<rect");
    expect(svg).not.toContain("<image");
    for (const size of [32, 192, 512]) {
      const relativePath = `${BRAND_ROOT}/day-mark-${size}.png`;
      const bytes = await readFile(path.join(PROJECT_ROOT, relativePath));
      const metadata = await sharp(bytes).metadata();
      expect(metadata).toMatchObject({ width: size, height: size, format: "png", hasAlpha: true });
      expect(result.outputs.find((entry) => entry.relativePath === relativePath)?.sha256).toBe(sha256(bytes));
    }
    const provenance = await readJson(`${BRAND_ROOT}/day-mark.provenance.json`, "TEST");
    expect(provenance.value.status).toBe("CODE_AUTHORED_DERIVED");
    expect(provenance.value.source.sha256).toBe(sha256(Buffer.from(svg)));
  });
});
