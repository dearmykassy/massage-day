import Link from "@/components/SiteLink";
import styles from "@/components/RegionTemplate6.module.css";
import type { RegionPageModel } from "@/lib/region-page-model";
import type { RegionChild } from "@/lib/regions";

type Item = Pick<RegionChild, "name" | "path" | "representativeCount">;

type Props = {
  regionModel?: RegionPageModel["gallery"];
  items?: Item[];
  label?: string;
  title?: string;
  summary?: string;
};

export function RegionGallery({ regionModel, items, label = "AREA DIRECTORY", title, summary }: Props) {
  const regions = regionModel?.items ?? items ?? [];
  const heading = regionModel?.heading ?? title ?? "주소별 연결 경로";
  const supportingCopy = regionModel?.summary ?? summary ?? `하위 경로 ${regions.length}개`;

  return (
    <section className={styles.directory} aria-labelledby="region-directory-title">
      <header className={styles.directoryHeading}>
        <div><p {...(regionModel ? { "data-region-copy-id": regionModel.indexCopyId } : {})}>{regionModel?.index ?? label}</p><h2 id="region-directory-title" {...(regionModel ? { "data-region-copy-id": regionModel.headingCopyId } : {})}>{heading}</h2></div>
        <span {...(regionModel ? { "data-region-copy-id": regionModel.summaryCopyId } : {})}>{supportingCopy}</span>
      </header>

      {regionModel ? (
        <article className={styles.directoryGuide} id={regionModel.guide.section.id}>
          <small>REGION CHECK</small><h2 data-region-copy-id={regionModel.guide.headingCopyId}>{regionModel.guide.section.heading}</h2>
          {regionModel.guide.section.paragraphs.map((paragraph, index) => <p key={paragraph} data-region-copy-id={regionModel.guide.paragraphCopyIds[index]}>{paragraph}</p>)}
          <Link href={regionModel.guide.actionPath} data-region-copy-id={regionModel.guide.actionCopyId}>{regionModel.guide.actionLabel}<span aria-hidden="true"> →</span></Link>
        </article>
      ) : null}

      {regions.length > 0 ? (
        <div className={styles.directoryGrid}>
          {regions.map((region, index) => {
            const number = "number" in region ? region.number : String(index + 1).padStart(2, "0");
            const count = "countLabel" in region ? region.countLabel : `${region.representativeCount}개 연결 지역`;
            return <Link href={region.path} className={styles.directoryCard} key={region.path}><span data-region-copy-id={regionModel ? `gallery:item:${index}:number` : undefined}>{number}</span><strong data-region-copy-id={regionModel ? `gallery:item:${index}:name` : undefined}>{region.name}</strong><small data-region-copy-id={regionModel ? `gallery:item:${index}:count` : undefined}>{count}</small><b aria-hidden="true">→</b></Link>;
          })}
        </div>
      ) : <p className={styles.terminal} data-region-copy-id={regionModel?.terminalCopyId}>{regionModel?.terminal ?? "도로명과 건물명은 전화에서 확인합니다."}</p>}
    </section>
  );
}
