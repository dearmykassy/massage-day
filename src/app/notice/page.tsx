import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { NOTICE_ITEMS, SERVICE_STEPS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/notice/",
  "마사지데이 공지사항 | 24시간 전화상담·현장 후불 기준",
  "마사지데이 공지에서 24시간 전화상담, 상담 전 준비 내용, 이용 후 현장 정산과 카드 사용 기준을 확인합니다.",
  ["마사지데이 공지사항", "출장마사지 24시간 상담", "출장마사지 후불 정산", "출장마사지 현장 카드"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function NoticePage() {
  return (
    <main className="fixed-page">
      <div className="fixed-frame">
        <header className="fixed-hero"><div className="fixed-hero-copy"><span className="eyebrow">NOTICE</span><h1>전화상담과 결제 상시 기준</h1><p>접수 시간, 통화에서 확인할 항목, 비용을 처리하는 시점과 카드 사용 방법을 적었습니다.</p></div><div className="fixed-stat-row" aria-label="공지 요약"><div><span>상담</span><strong>24시간</strong></div><div><span>결제</span><strong>현장 후불</strong></div><div><span>카드</span><strong>현장 단말기</strong></div></div></header>

        <section className="fixed-section" aria-labelledby="notice-page-title"><header className="section-heading"><div><span className="eyebrow">FOUR NOTICES</span><h2 id="notice-page-title">상시 공지 네 항목</h2><p>모든 지역 문의에 함께 적용되는 전화·결제 안내입니다.</p></div><Link href="/guide/">이용 방법 →</Link></header><div className="notice-list">{NOTICE_ITEMS.map((notice, index) => <article id={notice.slug} key={notice.slug}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{notice.title}</h2><p>{notice.summary}</p></div></article>)}</div></section>

        <section className="fixed-section split-callouts" aria-label="진행 순서와 전화 연결"><article className="plain-callout"><span className="eyebrow">CHECK ORDER</span><h2>확인 진행 순서</h2><ol className="mini-steps">{SERVICE_STEPS.map(([number, title]) => <li key={number}><b>{number}</b><span>{title}</span></li>)}</ol></article><article className="soft-callout"><span className="eyebrow">24H CONSULTATION</span><h2>받을 곳을 알린 뒤 가능한 일정을 묻습니다.</h2><p>받을 곳의 주소, 날짜와 시각, 인원, 코스와 이용 시간을 전화로 알려 주세요.</p><div className="button-row"><a className="button primary" href={PHONE_HREF}>{PHONE_DISPLAY} 문의</a><Link className="button outline" href="/pricing/">가격 보기</Link></div></article></section>
      </div>
    </main>
  );
}
