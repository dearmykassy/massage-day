const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/u;
const PHONE_LIKE_PATTERN = /(?:\+?\d[\d\s().-]{5,}\d)/gu;
const EMAIL_LIKE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;

function redactPrivateText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFKC")
    .replace(EMAIL_LIKE_PATTERN, " ")
    .replace(PHONE_LIKE_PATTERN, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export type AnalyticsPageType =
  | "home"
  | "area_index"
  | "region"
  | "blog_index"
  | "blog_post"
  | "pricing"
  | "guide"
  | "notice"
  | "page";

export function parseGaMeasurementId(value: string | undefined): string | undefined {
  const candidate = value?.trim().toUpperCase();
  return candidate && GA_MEASUREMENT_ID_PATTERN.test(candidate) ? candidate : undefined;
}

export function normalizePagePath(value: string | null | undefined): string {
  const pathOnly = (value || "/").split(/[?#]/u, 1)[0] || "/";
  const withLeadingSlash = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  const compact = withLeadingSlash
    .normalize("NFKC")
    .replace(EMAIL_LIKE_PATTERN, "[redacted]")
    .replace(PHONE_LIKE_PATTERN, "[redacted]")
    .replace(/\/{2,}/gu, "/");
  return compact === "/" ? "/" : `${compact.replace(/\/+$/u, "")}/`;
}

export function inferAnalyticsPageType(pathname: string): AnalyticsPageType {
  const path = normalizePagePath(pathname);

  if (path === "/") return "home";
  if (path === "/areas/") return "area_index";
  if (path.startsWith("/areas/")) return "region";
  if (path === "/blog/") return "blog_index";
  if (path.startsWith("/blog/")) return "blog_post";
  if (path === "/pricing/") return "pricing";
  if (path === "/guide/") return "guide";
  if (path === "/notice/") return "notice";
  return "page";
}

export function sanitizeCtaLocation(value: string | null | undefined): string {
  const sanitized = redactPrivateText(value)
    .replace(/^[|·•☎\s_-]+|[|·•☎\s_-]+$/gu, "")
    .slice(0, 80);

  return sanitized || "phone_cta";
}

export function resolveCtaLocation(
  dataLocation: string | null | undefined,
  text: string | null | undefined,
  ariaLabel: string | null | undefined,
): string {
  return sanitizeCtaLocation(dataLocation || text || ariaLabel);
}

export function sanitizePageTitle(value: string | null | undefined): string {
  return redactPrivateText(value).slice(0, 100) || "untitled_page";
}
