"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PHONE_HREF } from "@/lib/business";

export function BottomNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(window.scrollY > 520);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <>
      <div className="action-dock" aria-label="빠른 메뉴">
        <Link className="near-button" href="/areas/"><span aria-hidden="true">⌖</span> 지역 찾기</Link>
        <a className="call-button" href={PHONE_HREF}>
          <span aria-hidden="true">☎</span><strong>전화 문의</strong><small>365일 24시간</small>
        </a>
      </div>
      <button
        aria-label="맨 위로 이동"
        className={`scroll-top${visible ? " is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        type="button"
      >
        ↑
      </button>
    </>
  );
}
