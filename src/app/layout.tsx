import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Ga4Tracker } from "@/components/Ga4Tracker";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { parseGaMeasurementId } from "@/lib/analytics";
import { SITE_ORIGIN } from "@/lib/metadata";
import "./fixed-pages.css";
import "./globals.css";

const GA_MEASUREMENT_ID = parseGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: "마사지데이 | 지역·코스·이용 안내",
    template: "%s | 마사지데이",
  },
  description:
    "마사지데이에서 1,291개 지역 경로와 5개 코스의 시간별 금액, 전화 준비 항목과 현장 결제 기준을 확인합니다.",
  keywords: [
    "마사지데이",
    "출장마사지",
    "출장안마",
    "출장타이마사지",
    "출장아로마마사지",
    "출장홈타이",
  ],
  robots: { index: false, follow: false, noarchive: true },
  icons: {
    icon: [
      { url: "/images/massage-day-template6/brand/day-mark-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/massage-day-template6/brand/day-mark-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/massage-day-template6/brand/day-mark-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/images/massage-day-template6/brand/day-mark-32.png",
    apple: [{ url: "/images/massage-day-template6/brand/day-mark-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e11d48",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="마사지데이 안내 글 RSS"
          href={`${SITE_ORIGIN}/rss.xml`}
        />
      </head>
      <body>
        <div className="app-shell" id="top">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
        <BottomNav />
        {GA_MEASUREMENT_ID ? (
          <Suspense fallback={null}>
            <Ga4Tracker measurementId={GA_MEASUREMENT_ID} platformId="massage-day" />
          </Suspense>
        ) : null}
      </body>
    </html>
  );
}
