export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: FormDataEntryValue | string | null | undefined) {
    return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email: string) {
    return emailPattern.test(email);
}

export function validatePasswordStrength(password: string) {
    if (password.length < 10) {
        return "Password must be at least 10 characters long.";
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return "Password must include uppercase, lowercase, and number characters.";
    }

    return null;
}

export function getAppUrl() {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function getAuthCallbackUrl(nextPath: string) {
    const safePath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/login";
    return `${getAppUrl()}/auth/callback?next=${encodeURIComponent(safePath)}`;
}

type CookieOptionLike = {
    maxAge?: number;
    [key: string]: unknown;
};

export function secureCookieOptions(options: CookieOptionLike = {}) {
    return {
        ...options,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: options.maxAge ?? AUTH_SESSION_MAX_AGE_SECONDS,
    };
}
