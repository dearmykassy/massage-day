import Link from "next/link";
import Image from "next/image";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/business";

const FOOTER_LINKS = [
  ["/areas/", "지역 안내"],
  ["/pricing/", "코스·가격"],
  ["/guide/", "이용 방법"],
  ["/notice/", "공지사항"],
  ["/blog/", "안내 글"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <Link className="footer-logo" href="/" aria-label="마사지데이 홈">
          <span className="brand-mark" aria-hidden="true">
            <Image alt="" height={32} src="/images/massage-day-template6/brand/day-mark.svg" width={32} />
          </span>
          <strong>마사지데이</strong>
        </Link>
        <nav aria-label="하단 메뉴">
          {FOOTER_LINKS.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <Link className="footer-region" href="/areas/">1,291개 지역 경로 보기 →</Link>
        <p>365일 24시간 전화상담 · 선입금 없는 현장 후불 · 현장 카드 결제 가능</p>
        <small>주소와 일정, 인원, 코스와 이용 시간을 전화로 확인합니다.</small>
        <p className="footer-number">{PHONE_DISPLAY}</p>
        <a className="footer-call" href={PHONE_HREF}>전화 문의</a>
      </div>
    </footer>
  );
}
