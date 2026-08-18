"use client";

import Link from "@/components/SiteLink";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { RegionSearch } from "@/components/RegionSearch";
import { PHONE_HREF } from "@/lib/business";

const NAV = [
  ["/areas/", "지역 안내"],
  ["/pricing/", "코스·가격"],
  ["/guide/", "이용 방법"],
  ["/notice/", "공지사항"],
  ["/blog/", "안내 글"],
] as const;

const QUICK_REGIONS = [
  ["/areas/seoul/", "서울"],
  ["/areas/incheon/", "인천"],
  ["/areas/gyeonggi/", "경기"],
  ["/areas/busan/", "부산"],
  ["/areas/jeju/", "제주"],
] as const;

function trapTab(event: ReactKeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;
  const focusable = [...container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.offsetParent !== null);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

export function SiteHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previousPathname = useRef(pathname);

  const closeDrawer = useCallback((restoreFocus = true) => {
    setDrawerOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => openerRef.current?.focus());
    }
  }, []);

  const openDrawer = (button: HTMLButtonElement) => {
    openerRef.current = button;
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setDrawerOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", drawerOpen);
    if (drawerOpen) {
      window.requestAnimationFrame(() => {
        drawerRef.current?.querySelector<HTMLElement>("button, a[href], input")?.focus();
      });
    }
    return () => document.body.classList.remove("drawer-open");
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDrawer();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeDrawer, drawerOpen]);

  return (
    <>
      <header className="site-header">
        <div className="header-top">
          <div className="header-shell">
            <Link className="brand" href="/" aria-label="마사지데이 홈">
              <span className="brand-mark" aria-hidden="true">
                <Image alt="" height={32} priority src="/images/massage-day-template6/brand/day-mark.svg" width={32} />
              </span>
              <span className="brand-name">마사지데이</span>
            </Link>
            <RegionSearch className="header-search" placeholder="지역명을 입력하세요" />
            <button
              aria-expanded={drawerOpen}
              aria-label="전체 메뉴 열기"
              className="mobile-menu-open"
              onClick={(event) => openDrawer(event.currentTarget)}
              type="button"
            >
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>
        <nav className="header-nav" aria-label="주요 메뉴">
          <div className="nav-shell">
            <button
              aria-expanded={drawerOpen}
              aria-label="전체 메뉴 열기"
              className="desktop-menu-open"
              onClick={(event) => openDrawer(event.currentTarget)}
              type="button"
            >
              <span aria-hidden="true">☰</span>
            </button>
            {NAV.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
          </div>
        </nav>
      </header>

      <button
        aria-hidden={!drawerOpen}
        aria-label="전체 메뉴 닫기"
        className={`drawer-scrim${drawerOpen ? " is-open" : ""}`}
        inert={!drawerOpen}
        onClick={() => closeDrawer()}
        tabIndex={drawerOpen ? 0 : -1}
        type="button"
      />
      <aside
        aria-hidden={!drawerOpen}
        aria-label="전체 메뉴"
        aria-modal="true"
        className={`menu-drawer${drawerOpen ? " is-open" : ""}`}
        inert={!drawerOpen}
        onKeyDown={(event) => trapTab(event, drawerRef.current)}
        ref={drawerRef}
        role="dialog"
      >
        <header>
          <Link className="drawer-brand" href="/" onClick={() => closeDrawer(false)}>마사지데이</Link>
          <button aria-label="전체 메뉴 닫기" className="menu-close" onClick={() => closeDrawer()} type="button">×</button>
        </header>
        <RegionSearch className="drawer-search" onNavigate={() => closeDrawer(false)} />
        <nav aria-label="전체 메뉴 링크">
          {NAV.map(([href, label]) => (
            <Link href={href} key={href} onClick={() => closeDrawer(false)}>
              {label}<span aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
        <div className="drawer-regions" aria-label="빠른 지역 링크">
          {QUICK_REGIONS.map(([href, label]) => (
            <Link href={href} key={href} onClick={() => closeDrawer(false)}>{label}</Link>
          ))}
        </div>
        <div className="drawer-note">
          <h3>365일 24시간 전화상담</h3>
          <p>받을 주소, 원하는 날짜와 시각, 인원, 코스와 이용 시간을 준비해 주세요.</p>
          <a href={PHONE_HREF}>전화 문의</a>
        </div>
      </aside>
    </>
  );
}
