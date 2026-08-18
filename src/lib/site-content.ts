import { COURSE_SCORES, formatWon } from "@/lib/business";

export const SERVICE_STEPS = [
  ["01", "받을 주소 적기", "지역 페이지에서 상위 행정 계층을 대조하고 도로명, 건물 번호, 건물명을 메모합니다."],
  ["02", "전화 메모 완성", "날짜와 희망 시각, 인원, 코스명과 이용 시간을 주소 아래에 나누어 적습니다."],
  ["03", "통화로 항목 대조", "24시간 전화상담에서 준비한 주소와 일정, 선택한 가격 행을 순서대로 확인합니다."],
  ["04", "현장에서 후불 정산", "이용을 마친 뒤 같은 장소에서 현금 또는 무선 카드 단말기로 비용을 처리합니다."],
] as const;

export const SERVICE_FAQS = [
  ["전화는 언제 연결할 수 있나요?", "전화상담 창구는 24시간 운영합니다. 받을 주소와 날짜·시각을 준비해 문의하세요."],
  ["주소는 어디까지 알려야 하나요?", "지역 페이지에서 행정 계층을 확인한 뒤 도로명과 건물명을 전화로 전달합니다."],
  ["코스 금액은 어떻게 확인하나요?", "다섯 코스의 14개 가격 행에서 코스명과 이용 시간이 같은 줄을 대조합니다."],
  ["두 명도 함께 문의할 수 있나요?", "2인 프로그램은 두 사람의 코스와 이용 시간, 주소, 날짜·시각을 전화에서 확인합니다."],
  ["먼저 송금하는 금액이 있나요?", "예약금과 선입금 없이 이용을 마친 뒤 현장에서 후불로 정산합니다."],
  ["현장에서는 어떤 방법으로 결제하나요?", "현금이나 무선 카드 단말기 중 사용할 방법을 전화에서 확인할 수 있습니다."],
  ["비품과 소독은 어떻게 운영하나요?", "일회용 비품을 사용하며 관리 전과 관리 후에 각각 소독합니다."],
] as const;

export const NOTICE_ITEMS = [
  {
    slug: "phone-consultation",
    title: "24시간 전화 문의",
    summary: "주소와 날짜·시각, 인원, 코스를 준비해 언제든 전화로 확인할 수 있습니다.",
  },
  {
    slug: "consultation-details",
    title: "통화 메모 여섯 항목",
    summary: "도로명·건물명, 날짜, 시각, 인원, 코스명, 이용 시간을 구분해 적습니다.",
  },
  {
    slug: "onsite-payment",
    title: "이용 뒤 현장 후불",
    summary: "예약금이나 선입금을 보내지 않고 이용을 마친 장소에서 정산합니다.",
  },
  {
    slug: "card-payment",
    title: "현금·카드 결제 확인",
    summary: "현금과 무선 카드 단말기 중 사용할 방법을 통화에서 함께 확인합니다.",
  },
] as const;

export const COURSE_GROUPS = [...new Set(COURSE_SCORES.map((item) => item.course))].map(
  (course) => ({
    course,
    options: COURSE_SCORES.filter((item) => item.course === course).map((item) => ({
      minutes: item.minutes,
      price: formatWon(item.price),
    })),
  }),
);
