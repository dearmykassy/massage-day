export const PHONE_DISPLAY = "0508-202-3906";
export const PHONE_HREF = "tel:05082023906";

export const OPERATING_NOTES = [
  "24시간 전화상담",
  "선입금 없는 현장 후불",
  "현장 카드 결제 가능",
] as const;

export const COURSE_SCORES = [
  { course: "타이마사지", minutes: 60, price: 80000 },
  { course: "타이마사지", minutes: 90, price: 100000 },
  { course: "타이마사지", minutes: 120, price: 120000 },
  { course: "아로마마사지", minutes: 60, price: 90000 },
  { course: "아로마마사지", minutes: 90, price: 110000 },
  { course: "아로마마사지", minutes: 120, price: 130000 },
  { course: "힐링마사지", minutes: 60, price: 100000 },
  { course: "힐링마사지", minutes: 90, price: 120000 },
  { course: "힐링마사지", minutes: 120, price: 140000 },
  { course: "스페셜마사지", minutes: 60, price: 110000 },
  { course: "스페셜마사지", minutes: 90, price: 130000 },
  { course: "스페셜마사지", minutes: 120, price: 150000 },
  { course: "남성전용", minutes: 60, price: 120000 },
  { course: "남성전용", minutes: 90, price: 150000 },
] as const;

export function formatWon(price: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
}
