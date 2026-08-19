import type { CSSProperties } from "react";
import Link from "@/components/SiteLink";
import { RegionGallery } from "@/components/RegionGallery";
import styles from "@/components/RegionTemplate6.module.css";
import { PHONE_HREF } from "@/lib/business";
import { createRegionPageModel } from "@/lib/region-page-model";
import { getRegionalImageAssetPath } from "@/lib/regional-image-assignment";
import type { RegionNode } from "@/lib/regions";

export function RegionExperience({ node }: { node: RegionNode }) {
  const model = createRegionPageModel(node);
  const { content } = model;
  const heroStyle = {
    "--regional-image-desktop": `url("${getRegionalImageAssetPath(node, "desktop")}")`,
    "--regional-image-tablet": `url("${getRegionalImageAssetPath(node, "tablet")}")`,
    "--regional-image-mobile": `url("${getRegionalImageAssetPath(node, "mobile")}")`,
  } as CSSProperties;

  return (
    <main className={styles.page} data-region-route={model.route}>
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="region-title">
          <div className={styles.heroCopy}>
            <nav className={styles.breadcrumbs} aria-label="현재 위치">
              {model.breadcrumbs.map((crumb, index) => (
                <span key={crumb.path}>
                  {index > 0 ? <i aria-hidden="true">›</i> : null}
                  <Link href={crumb.path} data-region-copy-id={crumb.copyId}>{crumb.name}</Link>
                </span>
              ))}
            </nav>
            <p className={styles.eyebrow} data-region-copy-id={model.opening.eyebrowCopyId}>{content.eyebrow}</p>
            <h1 id="region-title" data-region-copy-id={model.opening.h1CopyId}>{content.h1}</h1>
            <div className={styles.hooks}>{content.hooks.map((hook, index) => <p key={hook} data-region-copy-id={model.opening.hookCopyIds[index]}>{hook}</p>)}</div>
            <div className={styles.actions}><a href={PHONE_HREF} data-region-copy-id={model.opening.primaryActionCopyId}>{content.ctaLabels[0]}</a><Link href="/pricing/" data-region-copy-id={model.opening.scoreActionCopyId}>{content.ctaLabels[1]}</Link></div>
          </div>
          <div className={styles.heroVisual} role="img" aria-label={`${model.scene.name} 지역 안내 배너`} style={heroStyle} />
          <div className={styles.heroStats} aria-label="지역 안내 요약">
            <div><span data-region-copy-id={model.scene.indexCopyId}>{model.scene.index}</span><strong data-region-copy-id={model.scene.nameCopyId}>{model.scene.name}</strong></div>
            <div><span>안내 구성</span><strong>{content.detailMode === "broad" ? "광역 서비스" : "지역 서비스"}</strong></div>
            <div><span>전화상담</span><strong>24시간</strong></div>
          </div>
        </section>

        <section className={styles.information} aria-labelledby="local-check-title">
          <header className={styles.sectionHeading}><div><p>LOCAL CHECKPOINTS</p><strong id="local-check-title" data-region-copy-id={model.scene.headingCopyId}>{model.scene.heading}</strong><span data-region-copy-id={model.scene.captionCopyId}>{model.scene.caption}</span></div></header>
          <div className={styles.detailGrid}>
            {model.movements.map((movement) => (
              <article className={styles.detailCard} id={movement.section.id} key={movement.section.id}>
                <div><span data-region-copy-id={movement.numberCopyId}>{movement.number}</span><small data-region-copy-id={movement.kickerCopyId}>{movement.kicker}</small></div>
                <h2 data-region-copy-id={movement.headingCopyId}>{movement.section.heading}</h2>
                {movement.section.paragraphs.map((paragraph, index) => <p key={paragraph} data-region-copy-id={movement.paragraphCopyIds[index]}>{paragraph}</p>)}
                {movement.action ? <Link className={styles.detailLink} href={movement.action.path} data-region-copy-id={movement.action.copyId}>{movement.action.label}<span aria-hidden="true"> →</span></Link> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.contact} aria-labelledby="region-contact-title">
          <div><p data-region-copy-id={model.finalBeat.labelCopyId}>{model.finalBeat.label}</p><strong className={styles.contactHeading} id="region-contact-title" data-region-copy-id={model.finalBeat.headingCopyId}>{model.finalBeat.heading}</strong><strong data-region-copy-id={model.finalBeat.numberCopyId}>{model.finalBeat.number}</strong></div>
          <a href={PHONE_HREF} data-region-copy-id={model.finalBeat.phoneCopyId}>{model.finalBeat.phone}</a>
        </section>

        <RegionGallery regionModel={model.gallery} />
      </div>
    </main>
  );
}
