import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { SERVICE_FAQS, SERVICE_STEPS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/guide/",
  "마사지데이 이용 방법 | 전화 준비와 현장결제 안내",
  "마사지데이 이용 전 주소, 날짜·시각, 인원, 코스·시간을 준비하고 전화상담부터 이용 후 현장 결제까지 진행하는 순서를 안내합니다.",
  ["마사지데이 이용 방법", "출장마사지 전화 준비", "출장마사지 현장 후불", "출장마사지 카드 결제"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function GuidePage() {
  return (
    <main className="fixed-page">
      <div className="fixed-frame">
        <header className="fixed-hero">
          <div className="fixed-hero-copy"><span className="eyebrow">HOW TO USE</span><h1>주소를 찾고 전화로 일정을 확인하는 순서</h1><p>도로명과 건물명, 날짜와 시각, 인원, 코스와 이용 시간을 한 번에 전달합니다.</p></div>
          <div className="fixed-stat-row" aria-label="전화 준비 항목"><div><span>장소</span><strong>주소·건물</strong></div><div><span>일정</span><strong>날짜·시각</strong></div><div><span>선택</span><strong>코스·시간</strong></div></div>
        </header>

        <section className="fixed-section" aria-labelledby="steps-page-title">
          <header className="section-heading"><div><span className="eyebrow">FOUR STEPS</span><h2 id="steps-page-title">이용 절차 네 단계</h2><p>지역 검색, 전화 확인, 이용, 현장 결제 순서입니다.</p></div><Link href="/pricing/">가격 보기 →</Link></header>
          <ol className="step-list">{SERVICE_STEPS.map(([number, title, copy]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        </section>

        <section className="fixed-section" aria-labelledby="standards-page-title">
          <header className="section-heading"><div><span className="eyebrow">OPERATING FACTS</span><h2 id="standards-page-title">전화·결제·비품 기준</h2><p>지역과 관계없이 함께 확인하는 운영 내용입니다.</p></div></header>
          <div className="info-grid">
            <article><span>PHONE</span><h3>365일 24시간 전화상담</h3><p>주소와 희망 일정을 시간대 구분 없이 전화로 전달할 수 있습니다.</p></article>
            <article><span>PAYMENT</span><h3>선입금 없는 현장 후불</h3><p>이용 전에 송금하지 않고 관리를 마친 장소에서 비용을 처리합니다.</p></article>
            <article><span>CARD</span><h3>현장 카드 결제</h3><p>현금 외 결제는 현장 무선 카드 단말기로 진행할 수 있습니다.</p></article>
            <article><span>CARE</span><h3>2인 프로그램과 위생 기준</h3><p>2인 동시 프로그램은 전화로 확인하며 일회용 비품과 관리 전후 소독 기준을 적용합니다.</p></article>
          </div>
        </section>

        <section className="fixed-section" aria-labelledby="faq-page-title"><header className="section-heading"><div><span className="eyebrow">FAQ</span><h2 id="faq-page-title">전화 전에 확인하는 질문</h2><p>주소 선택과 준비 항목, 결제 방식을 정리했습니다.</p></div></header><div className="faq-list">{SERVICE_FAQS.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

        <section className="contact-card" aria-label="전화 연결"><span className="eyebrow">24H CONSULTATION</span><h2>받을 장소와 일정을 전화로 확인하세요.</h2><p>{PHONE_DISPLAY} · 주소, 날짜·시각, 인원, 코스와 이용 시간</p><div><a className="button primary" href={PHONE_HREF}>전화 문의</a><Link className="button outline" href="/areas/">지역 찾기</Link></div></section>
      </div>
    </main>
  );
}
