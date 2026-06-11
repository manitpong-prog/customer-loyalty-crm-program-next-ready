import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "im_crm_admin_session_v1";

export type AdminSession = {
  email: string;
  expiresAt: string;
};

const DEFAULT_ADMIN_EMAIL = "admin@im-crm.local";
const DEFAULT_ADMIN_PASSWORD = "admin1234";
const DEFAULT_SESSION_DAYS = 7;

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "dev-only-admin-session-secret-change-me"
  );
}

export function getAdminEmail() {
  return (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

function getSessionMaxAgeSeconds() {
  const raw = Number(process.env.ADMIN_SESSION_DAYS || DEFAULT_SESSION_DAYS);
  const days = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_DAYS;
  return Math.round(days * 24 * 60 * 60);
}

export function getAdminSessionMaxAgeSeconds() {
  return getSessionMaxAgeSeconds();
}

function timingSafeStringEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function verifyAdminCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const expectedEmail = getAdminEmail();
  const expectedPassword = getAdminPassword();

  return (
    timingSafeStringEqual(normalizedEmail, expectedEmail) &&
    timingSafeStringEqual(password, expectedPassword)
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createAdminSessionToken(email: string) {
  const maxAgeSeconds = getAdminSessionMaxAgeSeconds();
  const expiresAtMs = Date.now() + maxAgeSeconds * 1000;
  const payload = base64UrlEncode(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      exp: expiresAtMs,
    }),
  );
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string | null): AdminSession | null {
  if (!token || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload);
  if (!timingSafeStringEqual(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      email?: string;
      exp?: number;
    };

    if (!parsed.email || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }

    return {
      email: parsed.email,
      expiresAt: new Date(parsed.exp).toISOString(),
    };
  } catch {
    return null;
  }
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: getAdminSessionMaxAgeSeconds(),
  };
}

export function isUsingDefaultAdminCredentials() {
  return !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD;
}
