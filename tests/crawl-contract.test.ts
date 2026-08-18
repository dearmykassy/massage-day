import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  resolveSiteLinkPrefetch,
  type SiteLinkPrefetchValue,
} from "@/lib/link-prefetch";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(repositoryRoot, "src");
const wrapperPath = "src/components/SiteLink.tsx";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:ts|tsx)$/u.test(entry.name) ? [absolute] : [];
  });
}

describe("internal link crawl contract", () => {
  it("forces production prefetch off without changing non-production requests", () => {
    const requestedValues: SiteLinkPrefetchValue[] = [
      undefined,
      null,
      "auto",
      true,
      false,
    ];

    for (const requested of requestedValues) {
      expect(resolveSiteLinkPrefetch(requested, "production")).toBe(false);
      expect(resolveSiteLinkPrefetch(requested, "development")).toBe(requested);
      expect(resolveSiteLinkPrefetch(requested, "test")).toBe(requested);
    }
  });

  it("allows only the central wrapper to import next/link", () => {
    const directImports = sourceFiles(sourceRoot)
      .filter((file) =>
        /(?:from\s+|import\s*\(|require\s*\()\s*["']next\/link["']/u.test(
          readFileSync(file, "utf8"),
        ),
      )
      .map((file) => relative(repositoryRoot, file).split("\\").join("/"));

    expect(directImports).toEqual([wrapperPath]);
  });

  it("preserves anchor props and applies the forced prefetch after spread props", () => {
    const wrapper = readFileSync(join(repositoryRoot, wrapperPath), "utf8");
    expect(wrapper).toMatch(/type SiteLinkProps = ComponentProps<typeof NextLink>/u);
    expect(wrapper).toMatch(/<NextLink\s+[\s\S]*\.\.\.props/u);
    expect(wrapper).toMatch(
      /prefetch=\{resolveSiteLinkPrefetch\(prefetch, process\.env\.NODE_ENV\)\}/u,
    );
    expect(wrapper.indexOf("{...props}")).toBeLessThan(
      wrapper.indexOf("prefetch={"),
    );
  });
});
