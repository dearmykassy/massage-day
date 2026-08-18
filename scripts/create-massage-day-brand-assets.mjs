import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  BRAND_ROOT,
  PROJECT_ROOT,
  jsonBytes,
  sha256,
  writeNewOrExact,
} from "./lib/massage-day-image-common.mjs";

const SVG_PATH = `${BRAND_ROOT}/day-mark.svg`;
const PROVENANCE_PATH = `${BRAND_ROOT}/day-mark.provenance.json`;
const SIZES = [32, 192, 512];

function brandFail(code) {
  throw new Error(`MASSAGE_DAY_BRAND_${code}`);
}

export async function createBrandAssets() {
  const svgBytes = await readFile(path.join(PROJECT_ROOT, SVG_PATH)).catch(() => brandFail("SVG_MISSING"));
  const svg = svgBytes.toString("utf8");
  if (
    !svg.includes('viewBox="0 0 64 64"') ||
    svg.includes("<rect") ||
    svg.includes("<image") ||
    svg.includes("data:image")
  ) brandFail("SVG_TRANSPARENCY_OR_STRUCTURE");

  const outputs = [];
  for (const size of SIZES) {
    const bytes = await sharp(svgBytes, { density: Math.max(144, size * 4) })
      .resize(size, size, { fit: "contain" })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    const metadata = await sharp(bytes).metadata();
    if (metadata.width !== size || metadata.height !== size || metadata.hasAlpha !== true) {
      brandFail(`PNG_CONTRACT:${size}`);
    }
    const relativePath = `${BRAND_ROOT}/day-mark-${size}.png`;
    await writeNewOrExact(relativePath, bytes, "BRAND");
    outputs.push({ relativePath, sha256: sha256(bytes), width: size, height: size, format: "png", hasAlpha: true });
  }
  const provenance = {
    schemaVersion: "massage-day-code-authored-brand-mark/v1",
    status: "CODE_AUTHORED_DERIVED",
    platformKey: "massage-day",
    motif: "daytime sunrise above a horizon",
    distinction: "No heart and no orbit motif; transparent background; simple flat vector geometry.",
    generation: { mode: "code-authored-svg", imageGenerationCalls: 0 },
    source: { relativePath: SVG_PATH, sha256: sha256(svgBytes), viewBox: "0 0 64 64" },
    outputs,
  };
  const provenanceBytes = jsonBytes(provenance);
  await writeNewOrExact(PROVENANCE_PATH, provenanceBytes, "BRAND");
  return { ...provenance, provenance: { relativePath: PROVENANCE_PATH, sha256: sha256(provenanceBytes) } };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  const result = await createBrandAssets();
  console.log(JSON.stringify({ status: result.status, outputs: result.outputs.length }, null, 2));
}
