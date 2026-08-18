import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/SiteLink";
import { RegionSearch } from "@/components/RegionSearch";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { OPERATING_NOTES, PHONE_DISPLAY, PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_ROOT_KEYS, getRootNode, ROOT_LABELS } from "@/lib/regions";
import { COURSE_GROUPS, NOTICE_ITEMS, SERVICE_FAQS, SERVICE_STEPS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/",
  "마사지데이 | 전국 출장마사지 지역·코스·이용 안내",
  "마사지데이에서 1,291개 지역 경로와 5개 코스 14개 금액, 전화 준비 항목, 선입금 없는 현장 후불과 카드 결제 기준을 확인합니다.",
  [
    "마사지데이",
    "전국 출장마사지",
    "출장안마",
    "출장타이마사지",
    "출장아로마마사지",
    "출장홈타이",
  ],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function Home() {
  const roots = ACTIVE_ROOT_KEYS.map((key) => {
    const node = getRootNode(key);
    return {
      key,
      shortName: ROOT_LABELS[key].short,
      name: ROOT_LABELS[key].short,
      scope: ROOT_LABELS[key].scope,
      path: `${node.path}/`,
      count: node.records.length,
      image: `/images/massage-day-template6/home-regions/${key}.webp`,
    };
  });

  return (
    <main className="home-page">
      <div className="page-shell">
        <section className="home-hero" aria-labelledby="home-hero-title">
          <div className="home-hero-copy">
            <span className="eyebrow">REGION · COURSE · PHONE</span>
            <h1 id="home-hero-title">주소와 이용 항목을 먼저 확인하는 <span className="nowrap">마사지데이</span></h1>
            <p>
              받을 주소의 지역 페이지를 찾고 날짜와 시각, 인원, 코스와 이용 시간을 정리해 전화로 현재 일정을 확인합니다.
            </p>
            <RegionSearch className="hero-search" />
            <div className="hero-actions">
              <Link className="button primary" href="/areas/">지역 찾기</Link>
              <a className="button outline" href={PHONE_HREF}>전화 문의</a>
            </div>
          </div>
          <div className="home-hero-visual">
            <Image
              alt="거울 앞에서 휴대전화를 확인하는 성인 한국 여성"
              fill
              priority
              sizes="(max-width: 840px) 100vw, 520px"
              src="/images/massage-day-template6/home/hero.webp"
            />
          </div>
          <div className="hero-stats" aria-label="사이트 안내 요약">
            <div><span>시작 권역</span><strong>11개</strong></div>
            <div><span>지역 경로</span><strong>1,291개</strong></div>
            <div><span>전화상담</span><strong>24시간</strong></div>
          </div>
        </section>

        <section className="home-section" aria-labelledby="featured-title">
          <header className="section-heading">
            <div>
              <span className="eyebrow">START HERE</span>
              <h2 id="featured-title">주요 지역 바로가기</h2>
              <p>서울부터 구미까지 8개 권역의 지역 페이지를 모았습니다.</p>
            </div>
            <Link href="/areas/">전체 지역 →</Link>
          </header>
          <div className="area-grid">
            {roots.slice(0, 8).map((root, index) => (
              <article className="area-card" key={root.path}>
                <Link className="area-media" href={root.path} aria-label={`${root.name} 지역 안내 열기`}>
                  <Image alt={`${root.name} 지역 안내 배너`} fill sizes="(max-width: 767px) 50vw, (max-width: 1099px) 33vw, 25vw" src={root.image} />
                  <b>{String(index + 1).padStart(2, "0")}</b><em>{root.shortName}</em>
                </Link>
                <div className="area-info">
                  <h3>{root.name}</h3>
                  <p>{root.scope}에서 세부 주소 단계로 이동합니다.</p>
                  <strong>연결 지역 {root.count}개</strong>
                  <Link href={root.path}>지역 열기</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section info-section" aria-labelledby="standards-title">
          <span className="eyebrow">COMMON RULES</span>
          <h2 id="standards-title">전화와 결제 공통 기준</h2>
          <p className="lead">모든 지역 문의에 같은 방식으로 적용되는 운영 내용입니다.</p>
          <div className="info-grid">
            {NOTICE_ITEMS.map((notice, index) => (
              <article key={notice.slug}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{notice.title}</h3><p>{notice.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section info-section" aria-labelledby="courses-title">
          <header className="section-heading">
            <div><span className="eyebrow">COURSE &amp; PRICE</span><h2 id="courses-title">5개 코스 시간별 금액</h2><p>코스 카드는 금액표만 표시합니다.</p></div>
            <Link href="/pricing/">전체 금액표 →</Link>
          </header>
          <div className="course-grid">
            {COURSE_GROUPS.map((group, index) => (
              <article className="course-card" key={group.course}>
                <header><span>{String(index + 1).padStart(2, "0")}</span><h3>{group.course}</h3></header>
                <ul>{group.options.map((option) => <li key={option.minutes}><b>{option.minutes}분</b><strong>{option.price}</strong></li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section info-section" aria-labelledby="steps-title">
          <span className="eyebrow">FOUR STEPS</span>
          <h2 id="steps-title">검색부터 현장 결제까지</h2>
          <ol className="step-list">
            {SERVICE_STEPS.map(([number, title, copy]) => (
              <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></li>
            ))}
          </ol>
        </section>

        <section className="home-section info-section" aria-labelledby="blog-title">
          <header className="section-heading">
            <div><span className="eyebrow">MASSAGE DAY NOTES</span><h2 id="blog-title">전화 전에 확인할 글</h2><p>상황별 주소와 일정 준비 항목을 나눠 적었습니다.</p></div>
            <Link href="/blog/">안내 글 전체 →</Link>
          </header>
          <div className="blog-preview-grid">
            {BLOG_POSTS.map((post, index) => (
              <article className="blog-preview-card" key={post.slug}>
                <Link className="blog-preview-media" href={getBlogPostPath(post)}>
                  <Image alt={post.image.alt} fill sizes="(max-width: 767px) 100vw, 50vw" src={post.image.src} />
                  <span>NOTE {String(index + 1).padStart(2, "0")}</span>
                </Link>
                <div><small>{post.category}</small><h3><Link href={getBlogPostPath(post)}>{post.title}</Link></h3><p>{post.description}</p><Link href={getBlogPostPath(post)}>글 읽기 →</Link></div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section info-section" aria-labelledby="faq-title">
          <span className="eyebrow">BEFORE YOU CALL</span>
          <h2 id="faq-title">문의 전 정리할 질문</h2>
          <div className="faq-list">
            {SERVICE_FAQS.slice(0, 5).map(([question, answer]) => (
              <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>
            ))}
          </div>
        </section>

        <section className="contact-card" aria-labelledby="contact-title">
          <span className="eyebrow">365 DAYS · 24 HOURS</span>
          <h2 id="contact-title">받을 주소와 이용 항목을 전화로 알려 주세요.</h2>
          <p>{OPERATING_NOTES.join(" · ")} · {PHONE_DISPLAY}</p>
          <div><a className="button primary" href={PHONE_HREF}>전화 문의</a><Link className="button outline" href="/pricing/">가격 보기</Link><Link className="button outline" href="/guide/">이용 방법</Link></div>
        </section>

        <section className="home-section root-directory" aria-labelledby="root-directory-title">
          <header className="section-heading">
            <div><span className="eyebrow">FULL DIRECTORY</span><h2 id="root-directory-title">11개 시작 권역 전체</h2><p>받을 주소가 속한 권역을 고른 뒤 하위 지역으로 이동합니다.</p></div>
            <Link href="/areas/">지역 검색 →</Link>
          </header>
          <div className="root-directory-grid">
            {roots.map((root, index) => (
              <Link className="root-directory-card" href={root.path} key={root.path}>
                <span className="root-directory-media">
                  <Image alt="" fill sizes="(max-width: 767px) 50vw, (max-width: 1099px) 33vw, 25vw" src={root.image} />
                </span>
                <span className="root-directory-copy"><b>{String(index + 1).padStart(2, "0")}</b><strong>{root.name}</strong><small>연결 지역 {root.count}개</small></span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
