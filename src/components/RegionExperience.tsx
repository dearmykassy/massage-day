import type { CSSProperties } from "react";
import Link from "next/link";
import { RegionGallery } from "@/components/RegionGallery";
import styles from "@/components/RegionTemplate6.module.css";
import { PHONE_HREF } from "@/lib/business";
import { createRegionPageModel } from "@/lib/region-page-model";
import { getRegionalImageAssetPath } from "@/lib/regional-image-assignment";
import type { RegionNode } from "@/lib/regions";
import { COURSE_GROUPS, SERVICE_FAQS } from "@/lib/site-content";

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
          <div className={styles.heroVisual} role="img" aria-label={`${node.displayName} 지역 안내 배너`} style={heroStyle} />
          <div className={styles.heroStats} aria-label="지역 안내 요약">
            <div><span data-region-copy-id={model.scene.indexCopyId}>{model.scene.index}</span><strong data-region-copy-id={model.scene.nameCopyId}>{model.scene.name}</strong></div>
            <div><span>안내 구성</span><strong>{content.detailMode === "broad" ? "광역 상세" : "주소 상세"}</strong></div>
            <div><span>전화상담</span><strong>24시간</strong></div>
          </div>
        </section>

        <section className={styles.information} aria-labelledby="local-check-title">
          <header className={styles.sectionHeading}><div><p>LOCAL CHECKPOINTS</p><h2 id="local-check-title">{node.displayName} 이용 전 확인 항목</h2><span data-region-copy-id={model.scene.captionCopyId}>{model.scene.caption}</span></div></header>
          <div className={styles.detailGrid}>
            {model.movements.map((movement) => (
              <article className={styles.detailCard} id={movement.section.id} key={movement.section.id}>
                <div><span data-region-copy-id={movement.numberCopyId}>{movement.number}</span><small data-region-copy-id={movement.kickerCopyId}>{movement.kicker}</small></div>
                <h2 data-region-copy-id={movement.headingCopyId}>{movement.section.heading}</h2>
                {movement.section.paragraphs.map((paragraph, index) => <p key={paragraph} data-region-copy-id={movement.paragraphCopyIds[index]}>{paragraph}</p>)}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.information} aria-labelledby="region-course-title">
          <header className={styles.sectionHeadingRow}><div className={styles.sectionHeading}><div><p>COURSE &amp; PRICE</p><h2 id="region-course-title">5개 코스 시간별 금액</h2><span>코스 카드는 금액 정보만 표시합니다.</span></div></div><Link href="/pricing/">14개 금액 전체 →</Link></header>
          <div className={styles.courseGrid}>
            {COURSE_GROUPS.map((group, index) => (
              <article className={styles.courseCard} key={group.course}>
                <header><span>{String(index + 1).padStart(2, "0")}</span><h3>{group.course}</h3></header>
                <ul>{group.options.map((option) => <li key={option.minutes}><b>{option.minutes}분</b><strong>{option.price}</strong></li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.information} aria-labelledby="region-faq-title">
          <header className={styles.sectionHeading}><div><p>BEFORE YOU CALL</p><h2 id="region-faq-title">전화 전에 확인하는 질문</h2></div></header>
          <div className={styles.faqList}>{SERVICE_FAQS.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className={styles.contact} aria-labelledby="region-contact-title">
          <div><p data-region-copy-id={model.finalBeat.labelCopyId}>{model.finalBeat.label}</p><h2 id="region-contact-title" data-region-copy-id={model.finalBeat.headingCopyId}>{model.finalBeat.heading}</h2><strong data-region-copy-id={model.finalBeat.numberCopyId}>{model.finalBeat.number}</strong></div>
          <a href={PHONE_HREF} data-region-copy-id={model.finalBeat.phoneCopyId}>{model.finalBeat.phone}</a>
        </section>

        <RegionGallery regionModel={model.gallery} />
      </div>
    </main>
  );
}
