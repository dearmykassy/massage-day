import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BLOG_POSTS, getBlogPostPath } from "@/data/blog-posts";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";

export const metadataContract = createRouteMetadataContract(
  "/blog/",
  "마사지데이 안내 글 | 출장 문의 주소·일정 준비",
  "마사지데이 안내 글에서 출장마사지를 문의하기 전에 준비할 주소, 날짜와 시각, 인원, 코스와 결제 항목을 상황별로 확인합니다.",
  ["마사지데이 안내 글", "출장마사지 통화 항목", "출장마사지 주소 준비", "출장안마 일정 확인"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

function formatDate(value: string): string {
  return value.slice(0, 10).replaceAll("-", ".");
}

export default function BlogIndexPage() {
  return (
    <main className="fixed-page">
      <div className="fixed-frame">
        <header className="fixed-hero"><div className="fixed-hero-copy"><span className="eyebrow">MASSAGE DAY NOTES</span><h1>상황별 출장 문의 준비 메모</h1><p>받을 장소와 일정, 인원, 코스와 결제를 전화 전에 정리할 수 있도록 나눴습니다.</p></div><div className="fixed-stat-row" aria-label="안내 글 구성"><div><span>발행 글</span><strong>{BLOG_POSTS.length}편</strong></div><div><span>주요 항목</span><strong>주소·일정</strong></div><div><span>전화상담</span><strong>24시간</strong></div></div></header>

        <section className="fixed-section" aria-labelledby="blog-list-title">
          <header className="section-heading"><div><span className="eyebrow">PUBLISHED NOTES</span><h2 id="blog-list-title">전화 전 확인 글</h2><p>현재 상황에 맞는 글에서 전달 항목을 확인합니다.</p></div><Link href="/guide/">이용 방법 →</Link></header>
          <div className="blog-grid">
            {BLOG_POSTS.map((post, index) => (
              <article className="blog-card" key={post.slug}>
                <Link className="blog-card-media" href={getBlogPostPath(post)}>
                  <Image alt={post.image.alt} fill sizes="(max-width: 767px) 100vw, 50vw" src={post.image.src} />
                  <span>NOTE {String(index + 1).padStart(2, "0")}</span>
                </Link>
                <div className="blog-card-copy"><small>{post.category}</small><h2><Link href={getBlogPostPath(post)}>{post.title}</Link></h2><p>{post.description}</p><footer><time dateTime={post.modifiedAt}>{formatDate(post.modifiedAt)}</time><Link href={getBlogPostPath(post)}>글 읽기 →</Link></footer></div>
              </article>
            ))}
          </div>
        </section>

        <section className="contact-card" aria-label="전화 문의"><span className="eyebrow">24H CONSULTATION</span><h2>받을 주소와 가능한 일정을 정리해 주세요.</h2><p>{PHONE_DISPLAY} · 인원, 코스명과 이용 시간을 함께 전달합니다.</p><div><a className="button primary" href={PHONE_HREF}>전화 문의</a><Link className="button outline" href="/pricing/">가격 보기</Link></div></section>
      </div>
    </main>
  );
}
