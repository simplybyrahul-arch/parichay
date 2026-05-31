export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const isAnalyticsEnabled =
  Boolean(GA_ID) &&
  (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_GA_DEBUG === "true");

export type AnalyticsEventName =
  | "signup_started"
  | "signup_completed"
  | "login_success"
  | "quick_booking_started"
  | "custom_project_started"
  | "equipment_request_started"
  | "booking_submitted"
  | "equipment_request_submitted"
  | "script_analysis_run"
  | "contact_form_submitted";

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "config" | "event" | "js",
      targetId: string | Date,
      config?: AnalyticsEventParams
    ) => void;
  }
}

export function trackPageView(url: string) {
  if (!isAnalyticsEnabled || !GA_ID || typeof window === "undefined" || !window.gtag) return;

  window.gtag("config", GA_ID, {
    page_path: url,
  });
}

export function trackEvent(eventName: AnalyticsEventName, params: AnalyticsEventParams = {}) {
  if (!isAnalyticsEnabled || typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", eventName, sanitizeAnalyticsParams(params));
}

function sanitizeAnalyticsParams(params: AnalyticsEventParams) {
  const blockedKeys = new Set(["email", "phone", "password", "payment", "card", "upi"]);

  return Object.fromEntries(
    Object.entries(params).filter(([key, value]) => {
      if (value === undefined) return false;
      const normalizedKey = key.toLowerCase();
      return !Array.from(blockedKeys).some((blockedKey) => normalizedKey.includes(blockedKey));
    })
  );
}
