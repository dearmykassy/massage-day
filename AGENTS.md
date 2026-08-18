# 마사지데이 작업 규칙

- 새 활동을 시작하기 전에 이 파일과 `DIARY.md`, `$HOME/Documents/Codex/runtome/PLATFORM_PERMANENT_RULES.md`를 끝까지 읽고, 확인된 변경과 검증 결과를 `DIARY.md` 맨 위에 최신순으로 기록한다.
- 시각·레이아웃 정본은 `$HOME/Documents/Services/Templetes/Template6`다. 90px 브랜드·검색 헤더와 75px 내비게이션, 1300px 본문, 분홍 테두리 카드, 4/3/2열 지역 카드, 모바일 68px 헤더·드로어·하단 CTA를 Next.js 정적 사이트로 옮긴다.
- 브랜드는 `마사지데이`, 플랫폼 ID는 `massage-day`로 고정한다. 고객 화면·메타·분석 이벤트·이미지 manifest에 다른 플랫폼 브랜드를 남기지 않는다.
- 운영 도메인은 아직 미정이다. 확정 전에는 `https://preview.massage-day.invalid` self canonical, `noindex,nofollow,nocache`, robots 전체 차단을 유지한다. 임의 실도메인이나 다른 플랫폼 측정 ID를 넣지 않는다.
- 지역 정본은 마사지봄과 byte-identical인 활성 1,291개 경로·계층이다. 없는 지역을 추가하지 않고 지역 페이지와 sitemap은 같은 `ACTIVE_REGION_NODES`를 사용하며 `generateStaticParams()`와 `dynamicParams = false`를 유지한다.
- 마사지봄의 공개 전화번호, 확정 가격표, 24시간 전화상담, 선입금 없는 현장 후불, 현장 카드 결제, 2인 프로그램, 일회용 비품·관리 전후 소독처럼 검증된 운영 사실만 공유한다. 고객 문장·섹션명·메타 문장은 복사하지 않는다.
- 모든 공개 대상 페이지는 meta title, meta keywords, meta description, self canonical, Open Graph와 Twitter 계약을 가진다. owner 계약상 keywords를 제공하되 검색 순위 보장으로 설명하지 않는다.
- 지역 meta title·meta keywords·meta description에는 고객 검색형 지역명을 쓴다. 각 행정 토큰 끝의 `특별자치도`, `특별자치시`, `특별시`, `광역시`, `도`, `시`만 제거해 서울특별시→서울, 인천광역시→인천, 경기도→경기, 제주특별자치도→제주, 수원시→수원처럼 표기한다. `구·군·읍·면·동·리`는 임의로 제거하지 않으며, 중복 지명은 같은 방식으로 줄인 상위 지역을 붙여 구분한다. 공식 행정명은 H1·본문·breadcrumb·schema에 유지하고 URL·canonical은 변경하지 않는다.
- 광역 상세는 `node.kind === "root" || /시$/u.test(node.displayName)`인 정확히 41개 경로다. 실제 주소 계층·직계 하위 지역·전화 준비·코스·시간·결제·첫 이용·변경 확인만 다루며 지도, 매장, 인기 장소, 후기·평점, 이용량, 이동·도착 시간은 근거가 없으면 제외한다.
- 나머지 1,250개 세부 페이지도 얇게 만들지 않는다. 상위·형제·주소 계층과 확인된 운영 정보를 사용한 독립 섹션을 제공하고, 하위 지역 디렉터리는 홈과 모든 지역 페이지의 마지막 콘텐츠 섹션에 둔다.
- 고객 문구는 마사지데이 전용으로 작성한다. 쓸데없는 수식, 감정적 서론, 과장, 최고·완벽·프리미엄·특별한·맞춤 같은 막연한 표현, 의료 효능, 후기·평점·인기, 배정·출발·도착 약속을 넣지 않는다.
- 플랫폼 내부에서는 지역·브랜드 정규화 뒤에도 page signature가 1,291개 고유해야 한다. 기존 7개 플랫폼과 긴 고객 문장, heading, title, description의 exact 및 브랜드·지역 정규화 충돌을 감사한다.
- 전체 canonical 공개 URL을 담는 `sitemap.xml`과 실제 발행일·영구 GUID·전체 본문을 담는 RSS 2.0 `rss.xml`을 함께 제공한다. 신규 실도메인 온보딩에서는 네이버 수집 주기를 `빠르게`로 설정한다.
- GA4는 사이트 전용 `NEXT_PUBLIC_GA_MEASUREMENT_ID`가 있을 때만 로드한다. `send_page_view:false`, 경로당 수동 page view 1회, Signals·광고 개인화 비활성화, 개인정보 없는 `phone_cta_clicked` 계약을 유지한다.
- 지역 배너 원본은 정확히 216개다. 기존 승인 사진 72개와 마사지데이 신규 사진 144개로 구성하고, 모든 원본은 최대 6개 경로에만 배정한다. 기존 사진은 71개×6회 + 1개×4회 = 430경로, 신규 사진은 143개×6회 + 1개×3회 = 861경로에 사용한다. 부모·자식 및 같은 부모의 형제 충돌을 허용하지 않는다.
- 재사용 사진은 원 플랫폼·경로·원본 SHA-256·라이선스·승인 이력을 provenance에 남기고 원본 바이트를 수정하지 않는다. 신규 사진은 built-in image generation을 원본당 정확히 1회 사용하고 실패·반려본도 감사 이력에 보존한다.
- 거울 셀피는 지역 상세 배너, 홈 히어로, 지역 찾기·블로그 배너 같은 배너·에디토리얼 영역에만 사용한다. 코스 카드에는 셀피를 넣지 않으며 Template6에서는 코스·가격 텍스트 카드로 유지한다.
- 인물 사진은 현대 한국 패션 화보로 연출한 완전 착의 성인 한국 여성 1명, 실제 거울과 일관된 단일 반사, 얼굴·휴대폰·거울 윤곽, 모바일 중앙 크롭을 확인한다. 선정적 의상·노골적 성적 연출·미성년 인상·문자·로고·워터마크·기형·중복 인물은 허용하지 않는다.
- 검색·드로어는 실제 동작해야 한다. 1,291개 지역 검색, focus trap·focus 복귀·body lock·Escape·backdrop 닫기·route 이동 후 닫기와 reduced-motion을 검증한다.
- 출시 전 `test`, copy audit, typecheck, lint, production build, built-output audit와 320/390/768/1440px 브라우저 QA를 통과한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
