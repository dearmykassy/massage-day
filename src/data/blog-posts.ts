import type { Metadata } from "next";
import { SITE_NAME, SITE_ORIGIN, SITE_ROBOTS } from "@/lib/metadata";

export type BlogPost = {
  slug:
    | "jeonhwa-jeon-juso-iljeong-memo"
    | "du-myeong-course-hyeonjang-gyeolje";
  category: string;
  title: string;
  description: string;
  keywords: readonly string[];
  publishedAt: string;
  modifiedAt: string;
  intro: string;
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
  checklist: readonly string[];
  relatedSlug: BlogPost["slug"];
  image: {
    assetId: "massage-day-note-01" | "massage-day-note-02";
    src: string;
    alt: string;
  };
};

export const BLOG_POSTS = [
  {
    slug: "jeonhwa-jeon-juso-iljeong-memo",
    category: "전화 전 준비",
    title: "주소와 일정 메모를 전화 순서대로 정리하는 방법",
    description:
      "출장마사지 전화 전에 행정 주소와 도로명·건물명, 날짜·시각, 인원, 코스·이용 시간을 빠짐없이 적는 순서를 설명합니다.",
    keywords: [
      "마사지데이 전화 준비",
      "출장마사지 주소 메모",
      "출장안마 일정 확인",
      "출장마사지 코스 시간",
    ],
    publishedAt: "2026-08-18T09:00:00+09:00",
    modifiedAt: "2026-08-18T09:00:00+09:00",
    intro:
      "전화상담에서 확인하는 내용은 받을 주소, 날짜와 시각, 인원, 코스명과 이용 시간입니다. 각 항목을 미리 나누어 적으면 지역 이름과 상세 주소를 섞지 않고 순서대로 전달할 수 있습니다.",
    sections: [
      {
        heading: "행정 주소와 건물 주소를 두 줄로 나누기",
        paragraphs: [
          "첫 줄에는 시·도부터 동·읍·면까지 행정 주소를 적습니다. 지역 페이지에서 선택한 계층이 실제 받을 곳과 같은지 위에서 아래 순서로 대조합니다.",
          "둘째 줄에는 도로명, 건물 번호, 건물명을 적습니다. 동·호수나 출입에 필요한 상세 내용은 공개 검색창에 남기지 않고 전화에서 전달합니다.",
        ],
      },
      {
        heading: "희망 시작 시각과 이용 시간을 구분하기",
        paragraphs: [
          "날짜와 희망 시작 시각은 일정 항목입니다. 코스의 60분·90분·120분은 이용 시간 항목이므로 시작 시각과 별도 칸에 기록합니다.",
          "날짜나 희망 시각이 둘 이상이면 후보마다 한 줄을 사용합니다. 실제 일정은 상세 주소를 알린 뒤 24시간 전화상담에서 확인합니다.",
        ],
      },
      {
        heading: "인원과 코스 가격 행을 함께 적기",
        paragraphs: [
          "한 명인지 두 명인지 인원을 먼저 정하고, 사람별 코스명과 이용 시간을 붙여 적습니다. 2인 프로그램은 두 사람의 선택 항목을 모두 전화에서 확인합니다.",
          "가격표는 다섯 코스의 14개 행으로 구성됩니다. 코스명과 이용 시간이 같은 행을 찾아 금액을 적고 공개되지 않은 조합을 따로 계산하지 않습니다.",
        ],
      },
      {
        heading: "통화 끝에 바뀐 항목만 다시 읽기",
        paragraphs: [
          "주소, 날짜·시각, 인원, 코스·시간 순서로 메모를 읽습니다. 현금과 무선 카드 단말기 중 사용할 현장 결제 방법도 마지막에 확인합니다.",
          "통화 중 내용이 달라지면 기존 메모를 지우기 전에 새 항목을 따로 적습니다. 마무리할 때 변경된 주소나 일정, 코스만 다시 읽어 서로 같은 내용을 확인합니다.",
        ],
      },
    ],
    checklist: [
      "행정 주소와 도로명·건물명",
      "날짜와 희망 시작 시각",
      "이용 인원",
      "코스명과 이용 시간",
      "현금 또는 카드 결제",
    ],
    relatedSlug: "du-myeong-course-hyeonjang-gyeolje",
    image: {
      assetId: "massage-day-note-01",
      src: "/images/massage-day-template6/blog/note-01.webp",
      alt: "실내 전신거울 앞에서 휴대전화 메모를 확인하는 성인 여성",
    },
  },
  {
    slug: "du-myeong-course-hyeonjang-gyeolje",
    category: "2인 문의 준비",
    title: "두 사람이 이용할 때 코스와 현장 결제를 확인하는 순서",
    description:
      "한 장소에서 두 명이 출장마사지를 문의할 때 사람별 코스·시간, 14개 가격 행, 현장 후불과 비품·소독 기준을 확인하는 순서입니다.",
    keywords: [
      "마사지데이 2인 프로그램",
      "2인 출장마사지 문의",
      "출장마사지 현장 후불",
      "출장마사지 카드 결제",
    ],
    publishedAt: "2026-08-18T10:00:00+09:00",
    modifiedAt: "2026-08-18T10:00:00+09:00",
    intro:
      "두 사람이 같은 장소에서 이용하려면 주소와 날짜·시각만 알리는 것으로는 부족합니다. 두 사람의 코스명과 이용 시간을 각각 적고, 현장 결제 방법과 일회용 비품·소독 기준까지 한 통화에서 확인합니다.",
    sections: [
      {
        heading: "두 사람의 선택 항목을 각각 한 줄에 쓰기",
        paragraphs: [
          "첫 번째 사람과 두 번째 사람을 구분해 코스명, 이용 시간을 한 줄씩 적습니다. 같은 코스를 골라도 시간이 다르면 별도 가격 행으로 봅니다.",
          "전화 첫 부분에서 2인 프로그램 문의라고 알립니다. 받을 주소, 날짜와 희망 시각을 전달한 뒤 두 줄의 코스 메모를 차례로 읽습니다.",
        ],
      },
      {
        heading: "14개 가격 행에서 사람별 금액 대조하기",
        paragraphs: [
          "타이·아로마·힐링·스페셜은 60분·90분·120분, 남성전용은 60분·90분으로 나뉩니다. 두 사람이 고른 조합을 전체 14개 행에서 각각 찾습니다.",
          "사람별 금액을 확인한 뒤 두 금액을 구분해 메모합니다. 코스나 이용 시간이 바뀌면 변경된 사람의 가격 행을 다시 대조합니다.",
        ],
      },
      {
        heading: "선입금 없이 사용할 현장 결제 방법 정하기",
        paragraphs: [
          "2인 문의에도 별도 예약금이나 선입금은 없습니다. 이용을 모두 마친 뒤 같은 장소에서 현장 후불로 정산합니다.",
          "현금과 무선 카드 단말기 가운데 사용할 방법을 전화에서 확인합니다. 결제 방법이 바뀌면 통화를 마치기 전에 새 방법을 다시 알립니다.",
        ],
      },
      {
        heading: "비품과 소독 기준을 함께 확인하기",
        paragraphs: [
          "이용 비품은 일회용 항목을 사용합니다. 두 사람이 이용할 때도 각자 사용할 비품 기준을 전화에서 확인할 수 있습니다.",
          "소독은 관리 전과 관리 후에 각각 적용합니다. 주소·일정·코스 메모를 확인한 다음 비품과 소독 두 항목을 마지막으로 묻습니다.",
        ],
      },
    ],
    checklist: [
      "두 사람이 받을 한 장소의 주소",
      "날짜와 희망 시작 시각",
      "사람별 코스명·이용 시간",
      "사람별 가격 행",
      "현장 결제와 비품·소독",
    ],
    relatedSlug: "jeonhwa-jeon-juso-iljeong-memo",
    image: {
      assetId: "massage-day-note-02",
      src: "/images/massage-day-template6/blog/note-02.webp",
      alt: "밝은 방의 거울 앞에서 두 사람의 이용 항목을 휴대전화로 확인하는 성인 여성",
    },
  },
] as const satisfies readonly BlogPost[];

export function findBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((candidate) => candidate.slug === slug);
}

export function getBlogPost(slug: BlogPost["slug"]): BlogPost {
  const post = findBlogPost(slug);
  if (!post) throw new Error(`MASSAGE_DAY_BLOG_POST_NOT_FOUND:${slug}`);
  return post;
}

export function getBlogPostPath(post: Pick<BlogPost, "slug">): string {
  return `/blog/${post.slug}/`;
}

export function createBlogMetadata(post: BlogPost): Metadata {
  const path = getBlogPostPath(post);
  const url = new URL(path, SITE_ORIGIN).href;
  const title = `${post.title} | ${SITE_NAME}`;
  return {
    title: { absolute: title },
    description: post.description,
    keywords: [...post.keywords],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      siteName: SITE_NAME,
      title,
      description: post.description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
    },
    twitter: {
      card: "summary",
      title,
      description: post.description,
    },
    robots: SITE_ROBOTS,
  };
}
