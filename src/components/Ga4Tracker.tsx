"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  inferAnalyticsPageType,
  normalizePagePath,
  parseGaMeasurementId,
  resolveCtaLocation,
  sanitizePageTitle,
} from "@/lib/analytics";

type Gtag = (...args: [command: string, ...values: unknown[]]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __ga4ConfiguredMeasurementIds?: Record<string, boolean>;
  }
}

const GA_CONFIG = {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
} as const;

function getQueuedGtag(): Gtag {
  window.dataLayer ||= [];
  window.gtag ||= (...args) => {
    window.dataLayer?.push(args);
  };
  return window.gtag;
}

function ensureGaConfigured(measurementId: string): Gtag {
  const gtag = getQueuedGtag();
  window.__ga4ConfiguredMeasurementIds ||= {};

  if (!window.__ga4ConfiguredMeasurementIds[measurementId]) {
    gtag("js", new Date());
    gtag("config", measurementId, GA_CONFIG);
    window.__ga4ConfiguredMeasurementIds[measurementId] = true;
  }

  return gtag;
}

function Ga4Events({ measurementId, platformId }: { measurementId: string; platformId: string }) {
  const pathname = usePathname();
  const lastPageView = useRef<string | null>(null);

  useEffect(() => {
    const pagePath = normalizePagePath(pathname || window.location.pathname);
    const pageViewKey = `${measurementId}:${pagePath}`;

    if (lastPageView.current === pageViewKey) return;
    lastPageView.current = pageViewKey;

    ensureGaConfigured(measurementId)("event", "page_view", {
      send_to: measurementId,
      platform_id: platformId,
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
      page_title: sanitizePageTitle(document.title),
      page_type: inferAnalyticsPageType(pagePath),
    });
  }, [measurementId, pathname, platformId]);

  useEffect(() => {
    function handlePhoneClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>('a[href^="tel:"]');
      if (!anchor) return;

      const pagePath = normalizePagePath(window.location.pathname);
      const dataLocation = anchor.dataset.analyticsLocation || anchor.dataset.ctaLocation;
      const ctaLocation = resolveCtaLocation(
        dataLocation,
        anchor.textContent,
        anchor.getAttribute("aria-label"),
      );

      ensureGaConfigured(measurementId)("event", "phone_cta_clicked", {
        send_to: measurementId,
        platform_id: platformId,
        page_path: pagePath,
        page_type: inferAnalyticsPageType(pagePath),
        cta_location: ctaLocation,
        transport_type: "beacon",
      });
    }

    document.addEventListener("click", handlePhoneClick, true);
    return () => document.removeEventListener("click", handlePhoneClick, true);
  }, [measurementId, platformId]);

  return null;
}

export function Ga4Tracker({
  measurementId,
  platformId,
}: {
  measurementId: string;
  platformId: string;
}) {
  const safeMeasurementId = parseGaMeasurementId(measurementId);
  if (!safeMeasurementId) return null;

  const serializedId = JSON.stringify(safeMeasurementId);
  const bootstrap = `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
window.__ga4ConfiguredMeasurementIds = window.__ga4ConfiguredMeasurementIds || {};
if (!window.__ga4ConfiguredMeasurementIds[${serializedId}]) {
  window.gtag('js', new Date());
  window.gtag('config', ${serializedId}, ${JSON.stringify(GA_CONFIG)});
  window.__ga4ConfiguredMeasurementIds[${serializedId}] = true;
}`;

  return (
    <>
      <Script id={`ga4-bootstrap-${safeMeasurementId}`} strategy="afterInteractive">
        {bootstrap}
      </Script>
      <Script
        id={`ga4-library-${safeMeasurementId}`}
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(safeMeasurementId)}`}
        strategy="afterInteractive"
      />
      <Ga4Events measurementId={safeMeasurementId} platformId={platformId} />
    </>
  );
}
