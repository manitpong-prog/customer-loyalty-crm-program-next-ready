"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BadgeCheck, Link2, LogIn, LogOut, ShieldCheck, Smartphone, UserCheck } from "lucide-react";
import {
  clearLineIdentity,
  LineAuthContext,
  LineIdentity,
  readStoredLineIdentity,
  saveLineIdentity,
} from "../lib/lineAuth";

type LineLoginPanelProps = {
  context: LineAuthContext;
  shopId: string;
  compact?: boolean;
  onAuthenticated?: (identity: LineIdentity | null) => void;
};

type LineAuthResponse = {
  ok: boolean;
  message?: string;
  identity?: LineIdentity;
};

const liffSdkUrl = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadLiffSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("window is not available"));
      return;
    }

    if (window.liff) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${liffSdkUrl}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("โหลด LIFF SDK ไม่สำเร็จ")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = liffSdkUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด LIFF SDK ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

const liffLoginPendingKey = "im_crm_liff_login_pending_v1";

const liffCallbackQueryKeys = new Set([
  "liff.state",
  "liff.referrer",
  "liffClientId",
  "liffRedirectUri",
  "liff.hback",
  "access_token",
  "id_token",
  "state",
  "friendship_status_changed",
  "error",
  "error_description",
]);

function decodeDeep(value: string | null): string {
  if (!value) return "";

  let decoded = value;
  for (let index = 0; index < 8; index += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  return decoded;
}

function getQueryParamsFromText(rawText: string): URLSearchParams {
  if (!rawText) return new URLSearchParams();

  const queryStart = rawText.indexOf("?");
  const queryText = rawText.startsWith("?")
    ? rawText.slice(1)
    : queryStart >= 0
      ? rawText.slice(queryStart + 1)
      : rawText;
  const hashStart = queryText.indexOf("#");

  return new URLSearchParams(hashStart >= 0 ? queryText.slice(0, hashStart) : queryText);
}

function getAppParamsFromLiffState(rawState: string | null): URLSearchParams {
  const appParams = new URLSearchParams();
  const decoded = decodeDeep(rawState);
  if (!decoded) return appParams;

  const candidates = [getQueryParamsFromText(decoded)];
  const nestedRedirect = candidates[0].get("liffRedirectUri");
  if (nestedRedirect) {
    candidates.push(getQueryParamsFromText(decodeDeep(nestedRedirect)));
  }

  for (const params of candidates) {
    const tab = params.get("tab");
    const code =
      params.get("coupon") ||
      params.get("couponCode") ||
      params.get("claimCode") ||
      params.get("code");
    const resetLine = params.get("resetLine");

    if (tab) appParams.set("tab", tab);
    if (code) appParams.set("code", code);
    if (resetLine) appParams.set("resetLine", resetLine);
  }

  return appParams;
}

function getCleanRedirectUri() {
  if (typeof window === "undefined") return "";

  const currentUrl = new URL(window.location.href);
  const cleanUrl = new URL(currentUrl.origin + currentUrl.pathname);
  const currentParams = new URLSearchParams(currentUrl.search);
  const appParamsFromLiffState = getAppParamsFromLiffState(currentParams.get("liff.state"));

  const tab = currentParams.get("tab") || appParamsFromLiffState.get("tab");
  const resetLine = currentParams.get("resetLine") || appParamsFromLiffState.get("resetLine");
  const code =
    currentParams.get("coupon") ||
    currentParams.get("couponCode") ||
    currentParams.get("claimCode") ||
    appParamsFromLiffState.get("code") ||
    (!currentParams.has("state") ? currentParams.get("code") : null);

  if (tab) cleanUrl.searchParams.set("tab", tab);
  if (code) cleanUrl.searchParams.set("code", code);
  if (resetLine) cleanUrl.searchParams.set("resetLine", resetLine);

  Array.from(currentParams.entries()).forEach(([key, value]) => {
    if (liffCallbackQueryKeys.has(key) || key.startsWith("liff.")) return;
    if (["tab", "code", "coupon", "couponCode", "claimCode", "resetLine"].includes(key)) return;
    cleanUrl.searchParams.set(key, value);
  });

  return cleanUrl.toString();
}

function clearLiffLoginPending() {
  try {
    window.sessionStorage.removeItem(liffLoginPendingKey);
  } catch {
    // Some embedded browsers can block sessionStorage.
  }
}

function markLiffLoginPending() {
  try {
    window.sessionStorage.setItem(liffLoginPendingKey, "1");
  } catch {
    // Some embedded browsers can block sessionStorage.
  }
}

function wasLiffLoginPending() {
  try {
    return window.sessionStorage.getItem(liffLoginPendingKey) === "1";
  } catch {
    return false;
  }
}


export default function LineLoginPanel({
  context,
  shopId,
  compact = false,
  onAuthenticated,
}: LineLoginPanelProps) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || "";
  const isMerchant = context === "merchant";
  const [identity, setIdentity] = useState<LineIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);
  const autoAuthTriedRef = useRef(false);

  const isOwner = useMemo(
    () => Boolean(identity?.ownerShopIds?.includes(shopId)),
    [identity?.ownerShopIds, shopId],
  );

  const publishIdentity = useCallback(
    (nextIdentity: LineIdentity | null) => {
      setIdentity(nextIdentity);
      if (nextIdentity) saveLineIdentity(nextIdentity);
      onAuthenticated?.(nextIdentity);
    },
    [onAuthenticated],
  );

  const refreshOwnerStatus = useCallback(
    async (current: LineIdentity) => {
      try {
        const response = await fetch(`/api/line/me?lineUserId=${encodeURIComponent(current.lineUserId)}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as LineAuthResponse;
        if (result.ok && result.identity) {
          publishIdentity(result.identity);
        }
      } catch {
        // Keep the stored identity. This panel must not block the existing app.
      }
    },
    [publishIdentity],
  );

  useEffect(() => {
    const stored = readStoredLineIdentity();
    if (stored) {
      publishIdentity(stored);
      refreshOwnerStatus(stored);
    }
  }, [publishIdentity, refreshOwnerStatus]);

  const authenticateCurrentLineSession = useCallback(async (options?: { allowRedirect?: boolean; silent?: boolean }) => {
    if (!liffId) {
      if (!options?.silent) {
        setStatusMessage("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LINE_LIFF_ID จึงยังล็อกอิน LINE จริงไม่ได้");
      }
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
      setStatusMessage("");
    }

    try {
      await loadLiffSdk();

      if (!window.liff) {
        throw new Error("ไม่พบ LIFF SDK หลังโหลด script");
      }

      await window.liff.init({ liffId });

      if (!window.liff.isLoggedIn()) {
        if (!options?.allowRedirect) {
          return;
        }

        if (wasLiffLoginPending()) {
          clearLiffLoginPending();
          throw new Error(
            "LINE Login กลับมาที่เว็บแล้ว แต่ยังไม่พบ session ของ LINE โปรดตรวจว่า NEXT_PUBLIC_LINE_LIFF_ID ใน Vercel ตรงกับ LIFF ID ที่เปิดอยู่ และกด Redeploy แล้ว",
          );
        }

        markLiffLoginPending();
        window.liff.login({ redirectUri: getCleanRedirectUri() });
        return;
      }

      clearLiffLoginPending();

      const [profile, idToken] = await Promise.all([
        window.liff.getProfile(),
        Promise.resolve(window.liff.getIDToken()),
      ]);

      const response = await fetch("/api/line/auth", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        body: JSON.stringify({
          context,
          shopId,
          idToken,
          profile,
        }),
      });

      const result = (await response.json()) as LineAuthResponse;

      if (!response.ok || !result.ok || !result.identity) {
        throw new Error(result.message || "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ");
      }

      publishIdentity(result.identity);
      if (!options?.silent) {
        setStatusMessage(result.identity.verified
          ? "ยืนยันตัวตน LINE สำเร็จ"
          : "บันทึกโปรไฟล์ LINE สำเร็จ แต่ยังไม่ได้ verify ID token ฝั่ง server");
      }
    } catch (error) {
      if (!options?.silent) {
        setStatusMessage(error instanceof Error ? error.message : "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ");
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [context, liffId, publishIdentity, shopId]);

  useEffect(() => {
    if (!liffId || identity || autoAuthTriedRef.current) return;

    autoAuthTriedRef.current = true;

    // When the page is opened through https://liff.line.me/{LIFF_ID}, LIFF often
    // already has a LINE session after initialization. In that case, authenticate
    // quietly without forcing another redirect loop.
    authenticateCurrentLineSession({ allowRedirect: false, silent: true });
  }, [authenticateCurrentLineSession, identity, liffId]);

  const loginWithLine = async () => {
    await authenticateCurrentLineSession({ allowRedirect: true });
  };

  const logout = () => {
    clearLineIdentity();
    setIdentity(null);
    setStatusMessage("ออกจากระบบ LINE แล้ว");
    onAuthenticated?.(null);
  };

  const handleLinkOwner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!identity) {
      setStatusMessage("กรุณาเข้าสู่ระบบด้วย LINE ก่อน");
      return;
    }

    if (!linkCode.trim()) {
      setStatusMessage("กรุณากรอกรหัสสำหรับเจ้าของร้าน");
      return;
    }

    setLinking(true);
    setStatusMessage("");

    try {
      const response = await fetch("/api/line/merchant-owner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopId,
          lineUserId: identity.lineUserId,
          linkCode: linkCode.trim(),
        }),
      });

      const result = (await response.json()) as LineAuthResponse;

      if (!response.ok || !result.ok || !result.identity) {
        throw new Error(result.message || "ยังผูกบัญชีเจ้าของร้านไม่สำเร็จ");
      }

      publishIdentity(result.identity);
      setLinkCode("");
      setStatusMessage("บันทึกบัญชี LINE นี้เป็นเจ้าของร้านแล้ว");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "ยังผูกบัญชีเจ้าของร้านไม่สำเร็จ");
    } finally {
      setLinking(false);
    }
  };

  const panelTone = isMerchant
    ? "border-amber-200 bg-amber-50 text-amber-950"
    : "border-emerald-200 bg-emerald-50 text-emerald-950";

  const actionTone = isMerchant
    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
    : "bg-[#06C755] text-white hover:bg-[#05b04b]";

  if (compact) {
    return (
      <div className={`mt-2 rounded-xl border px-2.5 py-1.5 ${panelTone}`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isMerchant ? "bg-amber-100" : "bg-emerald-100"}`}>
            {isMerchant ? <ShieldCheck className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="shrink-0 text-[8px] font-black uppercase tracking-[0.12em] opacity-70">
                {isMerchant ? "ร้านค้า LINE" : "LINE"}
              </p>
              {identity && (
                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-black ${identity.verified ? "bg-emerald-100 text-emerald-800" : "bg-white/70 text-slate-700"}`}>
                  <BadgeCheck className="h-2.5 w-2.5" />
                  เชื่อมแล้ว
                </span>
              )}
            </div>
            <p className="truncate text-[10px] font-black leading-tight">
              {identity ? identity.displayName : isMerchant ? "เข้าสู่ระบบร้านค้าด้วย LINE" : "เชื่อม LINE เพื่อสะสมแต้ม"}
            </p>
          </div>

          {identity ? (
            <button
              type="button"
              onClick={logout}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1 text-[8px] font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-2.5 w-2.5" />
              ออก
            </button>
          ) : (
            <button
              type="button"
              onClick={loginWithLine}
              disabled={isLoading || !liffId}
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[8px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${actionTone}`}
            >
              <LogIn className="h-2.5 w-2.5" />
              {isLoading ? "..." : "เชื่อม"}
            </button>
          )}
        </div>

        {statusMessage && (
          <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-black/10 bg-white/80 px-2 py-1 text-[8px] font-semibold text-slate-700">
            <AlertCircle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className={`mx-3 mt-3 rounded-3xl border p-3 shadow-sm ${panelTone}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isMerchant ? "bg-amber-100" : "bg-emerald-100"}`}>
          {isMerchant ? <ShieldCheck className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">
                {isMerchant ? "เข้าสู่ระบบร้านค้า" : "สมาชิก LINE"}
              </p>
              <h3 className="mt-1 text-sm font-black">
                {identity ? `เชื่อมต่อ LINE: ${identity.displayName}` : "เข้าสู่ระบบด้วย LINE"}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {identity ? (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={loginWithLine}
                  disabled={isLoading || !liffId}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${actionTone}`}
                >
                  <LogIn className="h-4 w-4" />
                  {isLoading ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย LINE"}
                </button>
              )}
            </div>
          </div>

          {identity ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-black ${identity.verified ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                <BadgeCheck className="h-3.5 w-3.5" />
                {identity.verified ? "ยืนยันผ่าน LINE แล้ว" : "ใช้ข้อมูลโปรไฟล์ LINE"}
              </span>
              {isMerchant && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-black ${isOwner ? "bg-emerald-100 text-emerald-800" : "bg-white text-amber-800"}`}>
                  <UserCheck className="h-3.5 w-3.5" />
                  {isOwner ? "เป็นเจ้าของร้านนี้" : "ยังไม่ได้ยืนยันเป็นเจ้าของร้านนี้"}
                </span>
              )}
              <span className="font-mono text-[10px] opacity-70">LINE ID: {identity.lineUserId.slice(0, 8)}...</span>
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 opacity-80">
              {liffId
                ? "เข้าสู่ระบบด้วย LINE เพื่อดูแต้มของคุณ และให้ร้านรู้ว่าเป็นสมาชิกคนเดิม"
                : "ยังไม่ได้ตั้งค่า LIFF ID จึงยังเข้าสู่ระบบด้วย LINE ไม่ได้"}
            </p>
          )}

          {isMerchant && identity && !isOwner && (
            <form onSubmit={handleLinkOwner} className="mt-3 grid gap-2 rounded-2xl border border-amber-200 bg-white/70 p-3 sm:grid-cols-[1fr_auto]">
              <input
                value={linkCode}
                onChange={(event) => setLinkCode(event.target.value)}
                placeholder="รหัสสำหรับเจ้าของร้าน"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={linking}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                <Link2 className="h-4 w-4" />
                {linking ? "กำลังตรวจสอบ..." : "ยืนยันเป็นเจ้าของร้าน"}
              </button>
            </form>
          )}

          {statusMessage && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {!compact && isMerchant && (
            <p className="mt-3 text-[11px] leading-5 opacity-75">
              ระยะ pilot นี้ ตอนนี้ใช้ LINE เป็นหลักสำหรับเจ้าของร้าน ส่วน PIN เดิมยังเก็บไว้เผื่อกรณีฉุกเฉินระหว่างทดสอบ
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
