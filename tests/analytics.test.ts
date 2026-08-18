import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  inferAnalyticsPageType,
  normalizePagePath,
  parseGaMeasurementId,
  resolveCtaLocation,
  sanitizePageTitle,
} from "@/lib/analytics";

describe("마사지데이 GA4 privacy contract", () => {
  it("loads only a valid explicit measurement ID", () => {
    expect(parseGaMeasurementId(undefined)).toBeUndefined();
    expect(parseGaMeasurementId(" g-ab12cd34 ")).toBe("G-AB12CD34");
    expect(parseGaMeasurementId('G-ABC123\" onload=alert(1)')).toBeUndefined();
  });

  it("normalizes paths without query strings, phone numbers, or email addresses", () => {
    expect(normalizePagePath("/areas/seoul/?utm_source=test#hero")).toBe("/areas/seoul/");
    expect(normalizePagePath("/call/0508-1234-5678")).toBe("/call/[redacted]/");
    expect(normalizePagePath("/member/person@example.com")).toBe("/member/[redacted]/");
    expect(inferAnalyticsPageType("/areas/seoul/")).toBe("region");
  });

  it("redacts CTA labels and page titles", () => {
    expect(resolveCtaLocation(undefined, "전화 0508-1234-5678", undefined)).toBe("전화");
    expect(sanitizePageTitle("고객 person@example.com 0508-1234-5678")).toBe("고객");
  });

  it("keeps manual page views and advertising signals disabled", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/Ga4Tracker.tsx"),
      "utf8",
    );
    expect(source).toContain("send_page_view: false");
    expect(source).toContain("allow_google_signals: false");
    expect(source).toContain("allow_ad_personalization_signals: false");
    expect(source).toContain('"event", "page_view"');
    expect(source).toContain('"event", "phone_cta_clicked"');
    expect(source).not.toContain("anchor.href");
  });
});
