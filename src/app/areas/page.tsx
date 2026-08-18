import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/SiteLink";
import { RegionSearch } from "@/components/RegionSearch";
import { createRouteMetadataContract, toNextMetadata } from "@/lib/metadata";
import { ACTIVE_ROOT_KEYS, getRootNode, ROOT_LABELS } from "@/lib/regions";

export const metadataContract = createRouteMetadataContract(
  "/areas/",
  "마사지데이 지역 찾기 | 전국 출장마사지 1,291개 경로",
  "마사지데이 지역 찾기에서 11개 시작 권역과 시·군·구, 동·읍·면으로 이어지는 1,291개 출장마사지 안내 경로를 검색합니다.",
  ["마사지데이 지역 찾기", "전국 출장마사지 지역", "출장마사지 주소 검색", "출장안마 동 검색"],
);
export const metadata: Metadata = toNextMetadata(metadataContract);

export default function AreasPage() {
  const roots = ACTIVE_ROOT_KEYS.map((key) => {
    const node = getRootNode(key);
    return {
      key,
      name: ROOT_LABELS[key].short,
      scope: ROOT_LABELS[key].scope,
      path: `${node.path}/`,
      count: node.records.length,
      image: `/images/massage-day-template6/home-regions/${key}.webp`,
    };
  });

  return (
    <main className="directory-page">
      <div className="page-shell">
        <header className="fixed-hero directory-hero">
          <div className="fixed-hero-copy">
            <span className="eyebrow">ADDRESS SEARCH</span>
            <h1>받을 주소의 지역 경로 찾기</h1>
            <p>시·군·구, 동·읍·면 또는 지역 별칭을 입력하면 해당 안내 경로로 이동합니다.</p>
            <RegionSearch className="directory-search" />
          </div>
          <div className="fixed-stat-row" aria-label="지역 페이지 요약">
            <div><span>시작 권역</span><strong>11개</strong></div>
            <div><span>전체 경로</span><strong>1,291개</strong></div>
            <div><span>검색 단위</span><strong>동·읍·면</strong></div>
          </div>
        </header>

        <section className="fixed-section" aria-labelledby="area-use-title">
          <header className="section-heading">
            <div><span className="eyebrow">HOW TO FIND</span><h2 id="area-use-title">검색 전에 확인할 기준</h2><p>안내 경로는 공개 주소 단계까지만 표시합니다.</p></div>
          </header>
          <div className="info-grid">
            <article><span>01</span><h3>현재 받을 주소</h3><p>숙소나 자택 등 실제 이용할 곳이 속한 지역명을 기준으로 검색합니다.</p></article>
            <article><span>02</span><h3>같은 이름 구분</h3><p>같은 지역명이 여러 곳에 있으면 시·도와 시·군·구를 함께 확인합니다.</p></article>
            <article><span>03</span><h3>상세 주소는 전화 전달</h3><p>도로명과 건물명, 출입에 필요한 내용은 공개 검색창이 아니라 전화에서 알립니다.</p></article>
          </div>
        </section>

        <section className="fixed-section root-directory" aria-labelledby="area-root-title">
          <header className="section-heading">
            <div><span className="eyebrow">11 STARTING POINTS</span><h2 id="area-root-title">11개 시작 권역 전체</h2><p>주소가 속한 권역을 선택하면 실제 하위 지역 경로를 확인할 수 있습니다.</p></div>
          </header>
          <div className="root-directory-grid">
            {roots.map((root, index) => (
              <Link className="root-directory-card" href={root.path} key={root.path}>
                <span className="root-directory-media">
                  <Image alt={`${root.name} 지역 안내 배너`} fill sizes="(max-width: 767px) 50vw, (max-width: 1099px) 33vw, 25vw" src={root.image} />
                </span>
                <span className="root-directory-copy">
                  <b>{String(index + 1).padStart(2, "0")}</b><strong>{root.name}</strong><small>{root.scope} · 연결 지역 {root.count}개</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
