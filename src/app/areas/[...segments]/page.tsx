import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegionExperience } from "@/components/RegionExperience";
import { createRegionContent } from "@/lib/content";
import {
  createRouteMetadataContract,
  toNextMetadata,
} from "@/lib/metadata";
import { serializeRegionPageJsonLd } from "@/lib/region-schema";
import { getActiveStaticParams, resolveRegionNode } from "@/lib/regions";

type Props = { params: Promise<{ segments: string[] }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getActiveStaticParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segments } = await params;
  const node = resolveRegionNode(segments);
  if (!node) return {};
  const content = createRegionContent(node);
  return toNextMetadata(
    createRouteMetadataContract(
      `${node.path}/`,
      content.title,
      content.description,
      content.keywords,
    ),
  );
}

export default async function RegionPage({ params }: Props) {
  const { segments } = await params;
  const node = resolveRegionNode(segments);
  if (!node) notFound();
  const schema = serializeRegionPageJsonLd(node);
  return (
    <>
      <RegionExperience node={node} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />
    </>
  );
}
