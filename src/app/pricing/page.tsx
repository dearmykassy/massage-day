import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { PHONE_HREF } from "@/lib/business";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { COURSE_GROUPS } from "@/lib/site-content";

export const metadataContract = createRouteMetadataContract(
  "/pricing/",
  "마사지데이 코스 가격 | 출장마사지 5개 코스 14개 금액",
  "마사지데이 타이·아로마·힐링·스페셜·남성전용 5개 코스의 14개 시간별 금액과 선입금 없는 현장 후불·카드 결제 기준을 안내합니다.",
  ["마사지데이 코스 가격", "출장마사지 14개 금액", "출장안마 이용 시간", "출장마사지 현장 카드"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function PricingPage() {
  return (
    <main className="fixed-page">
      <div className="fixed-frame">
        <header className="fixed-hero">
          <div className="fixed-hero-copy">
            <span className="eyebrow">COURSE &amp; PRICE</span>
            <h1>코스와 이용 시간을 함께 보는 금액표</h1>
            <p>타이·아로마·힐링·스페셜은 60·90·120분, 남성전용은 60·90분으로 구분합니다.</p>
          </div>
          <div className="fixed-stat-row" aria-label="공개 금액 구성">
            <div><span>코스</span><strong>5개</strong></div><div><span>금액 항목</span><strong>14개</strong></div><div><span>결제 시점</span><strong>이용 후</strong></div>
          </div>
        </header>

        <section className="fixed-section" aria-labelledby="price-list-title">
          <header className="section-heading">
            <div><span className="eyebrow">TEXT PRICE CARDS</span><h2 id="price-list-title">5개 코스 시간별 금액</h2><p>코스 이름과 이용 시간을 같은 카드에서 대조합니다.</p></div>
            <Link href="/guide/">이용 방법 →</Link>
          </header>
          <div className="course-grid">
            {COURSE_GROUPS.map((group, index) => (
              <article className="course-card" key={group.course}>
                <header><span>{String(index + 1).padStart(2, "0")}</span><h2>{group.course}</h2></header>
                <ul>{group.options.map((option) => <li key={option.minutes}><b>{option.minutes}분</b><strong>{option.price}</strong></li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <section className="fixed-section split-callouts" aria-label="결제와 통화 준비">
          <article className="soft-callout"><span className="eyebrow">ONSITE PAYMENT</span><h2>선입금 없이 이용 뒤 정산합니다.</h2><p>현금은 이용한 장소에서 처리하며, 카드는 현장 무선 단말기를 사용할 수 있습니다.</p><div className="button-row"><a className="button primary" href={PHONE_HREF}>전화 문의</a><Link className="button outline" href="/areas/">지역 찾기</Link></div></article>
          <article className="plain-callout"><span className="eyebrow">PHONE CHECKLIST</span><h2>통화 전에 여섯 항목을 준비합니다.</h2><p>도로명과 건물명, 날짜, 시각, 인원, 코스명과 이용 시간을 차례로 전달합니다.</p></article>
        </section>
      </div>
    </main>
  );
}
