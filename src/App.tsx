"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  initializeDatabase,
  getShops,
  getTransactions,
} from "./data/mockData";
import CustomerDashboard from "./components/CustomerDashboard";
import OwnerDashboard from "./components/OwnerDashboard";
import WebmasterDashboard from "./components/WebmasterDashboard";
import { getDefaultShopId, shopSlugToId } from "./lib/shopSlug";
import { clearLineIdentity } from "./lib/lineAuth";
import type { LineIdentity } from "./lib/lineAuth";
import {
  Sparkles,
  AppWindow,
  Store,
  ShieldAlert,
  Award,
  Layers,
  HelpCircle,
  Gift,
  Users,
  Activity,
  CheckCircle,
  Shield,
} from "lucide-react";

type AppRole = "customer" | "owner" | "webmaster";
type AppMode = "demo" | "customer" | "merchant" | "admin";
type CustomerTab = "home" | "rewards" | "code" | "history" | "profile";


const LIFF_CALLBACK_QUERY_KEYS = new Set([
  "liff.state",
  "liff.referrer",
  "liffClientId",
  "liffRedirectUri",
  "liff.hback",
  "state",
  "friendship_status_changed",
  "access_token",
  "id_token",
  "error",
  "error_description",
]);

function decodeLiffState(rawState: string | null): string {
  if (!rawState) return "";

  let decoded = rawState;
  for (let i = 0; i < 8; i += 1) {
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

function extractQueryParamsFromText(rawText: string): URLSearchParams {
  if (!rawText) return new URLSearchParams();

  const trimmed = rawText.trim();
  const queryStart = trimmed.indexOf("?");
  const queryText = trimmed.startsWith("?")
    ? trimmed.slice(1)
    : queryStart >= 0
      ? trimmed.slice(queryStart + 1)
      : trimmed;

  const hashStart = queryText.indexOf("#");
  const cleanQuery = hashStart >= 0 ? queryText.slice(0, hashStart) : queryText;

  return new URLSearchParams(cleanQuery);
}

function extractAppParamsFromLiffState(rawState: string | null): URLSearchParams {
  const extracted = new URLSearchParams();
  const decoded = decodeLiffState(rawState);
  if (!decoded) return extracted;

  const candidates = [extractQueryParamsFromText(decoded)];
  const nestedRedirect = candidates[0].get("liffRedirectUri");
  if (nestedRedirect) {
    candidates.push(extractQueryParamsFromText(decodeLiffState(nestedRedirect)));
  }

  for (const params of candidates) {
    const tab = params.get("tab");
    const appCode = params.get("coupon") || params.get("couponCode") || params.get("claimCode") || params.get("code");
    const resetLine = params.get("resetLine");

    if (tab) extracted.set("tab", tab);
    if (appCode) extracted.set("code", appCode);
    if (resetLine) extracted.set("resetLine", resetLine);
  }

  return extracted;
}

function hasLiffCallbackParams(params: URLSearchParams): boolean {
  return Boolean(
    params.has("liff.state") ||
      params.has("liffClientId") ||
      params.has("liffRedirectUri") ||
      params.has("liff.hback") ||
      params.has("friendship_status_changed") ||
      params.has("error") ||
      (params.has("state") && params.has("code"))
  );
}

function getEffectiveSearchParams(): URLSearchParams {
  const directParams = new URLSearchParams(window.location.search);
  const liffParams = extractAppParamsFromLiffState(directParams.get("liff.state"));
  const isLiffCallback = hasLiffCallbackParams(directParams);
  const merged = new URLSearchParams();

  const directTab = directParams.get("tab");
  const directAppCode =
    directParams.get("coupon") ||
    directParams.get("couponCode") ||
    directParams.get("claimCode") ||
    (!isLiffCallback ? directParams.get("code") : null);
  const directResetLine = directParams.get("resetLine");

  if (directTab) merged.set("tab", directTab);
  if (directAppCode) merged.set("code", directAppCode);
  if (directResetLine) merged.set("resetLine", directResetLine);

  liffParams.forEach((value, key) => {
    if (value) merged.set(key, value);
  });

  return merged;
}

function cleanCustomerEntryQuery(effectiveParams?: URLSearchParams) {
  try {
    const url = new URL(window.location.href);
    const currentParams = new URLSearchParams(url.search);
    const isLiffCallback = hasLiffCallbackParams(currentParams);
    const appTab = effectiveParams?.get("tab") || currentParams.get("tab");
    const appCode =
      effectiveParams?.get("code") ||
      currentParams.get("coupon") ||
      currentParams.get("couponCode") ||
      currentParams.get("claimCode") ||
      (!isLiffCallback ? currentParams.get("code") : null);

    Array.from(currentParams.keys()).forEach((key) => {
      if (LIFF_CALLBACK_QUERY_KEYS.has(key) || key.startsWith("liff.")) {
        url.searchParams.delete(key);
      }
    });

    // LINE OAuth also uses `code`; keep only app-owned coupon codes.
    if (isLiffCallback) url.searchParams.delete("code");
    url.searchParams.delete("coupon");
    url.searchParams.delete("couponCode");
    url.searchParams.delete("claimCode");
    url.searchParams.delete("resetLine");

    if (appTab) url.searchParams.set("tab", appTab);
    if (appCode) url.searchParams.set("code", appCode);

    window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ""));
  } catch (e) {
    console.error("Failed to clean URL", e);
  }
}

interface AppProps {
  initialRole?: AppRole;
  mode?: AppMode;
  initialShopId?: string;
  initialShopSlug?: string;
}

export default function App({
  initialRole = "customer",
  mode = "demo",
  initialShopId,
  initialShopSlug,
}: AppProps) {
  const isDemoMode = mode === "demo";
  const [activeRole, setActiveRole] = useState<AppRole>(initialRole);
  const [dataVersion, setDataVersion] = useState(0);
  const defaultShopId = initialShopId || (initialShopSlug ? shopSlugToId(initialShopSlug) : getDefaultShopId());
  const [selectedShopId, setSelectedShopId] = useState(defaultShopId);
  const [initialCouponCode, setInitialCouponCode] = useState<string>("");
  const [initialCustomerTab, setInitialCustomerTab] = useState<CustomerTab>("home");
  const [databaseLabel, setDatabaseLabel] = useState("กำลังเชื่อมต่อข้อมูล...");
  const [lineIdentity, setLineIdentity] = useState<LineIdentity | null>(null);
  const [isDatabaseBootstrapped, setIsDatabaseBootstrapped] = useState(isDemoMode);

  // Triggered when static storage modifies of children
  const handleDataChange = () => {
    setDataVersion((prev) => prev + 1);
  };

  const handleLineIdentityChange = useCallback(async (identity: LineIdentity | null) => {
    if (!identity) {
      setLineIdentity(null);
      return;
    }

    setLineIdentity((previous) => {
      const sameIdentity =
        previous?.lineUserId === identity.lineUserId &&
        previous?.customerId === identity.customerId &&
        JSON.stringify(previous?.ownerShopIds || []) === JSON.stringify(identity.ownerShopIds || []);

      return sameIdentity ? previous : identity;
    });

    // LINE login creates/updates the customer membership through /api/line/auth.
    // Do not call initializeDatabase() here: customer pages must use the scoped
    // /api/db/customer-state loader only. Re-loading the full CRM snapshot here
    // caused slow loads and refresh loops on LIFF deep links.
  }, []);

  useEffect(() => {
    if (!isDemoMode && selectedShopId !== defaultShopId) {
      setSelectedShopId(defaultShopId);
    }
  }, [defaultShopId, isDemoMode, selectedShopId]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const searchParams = getEffectiveSearchParams();
      const hasLiffState = new URLSearchParams(window.location.search).has("liff.state");
      const shouldResetLine = searchParams.get("resetLine") === "1";

      if (shouldResetLine) {
        clearLineIdentity();
        setLineIdentity(null);
        try {
          window.sessionStorage.removeItem("im_crm_liff_login_pending_v1");
        } catch {
          // ignore storage issues inside embedded browsers
        }
      }

      // Customer production routes must not block on the full CRM snapshot.
      // The CustomerDashboard fetches a small shop/customer scoped state after LIFF identity is known.
      // Merchant/admin/demo still use the full bootstrap because they need a broad management view.
      if (!isDemoMode && initialRole === "customer") {
        if (!isMounted) return;
        setDatabaseLabel("Neon PostgreSQL + Scoped Customer Load");
        setIsDatabaseBootstrapped(true);
      } else {
        const result = await initializeDatabase();

        if (!isMounted) return;

        setDatabaseLabel(
          result.source === "neon"
            ? "Neon PostgreSQL + Fresh Cache"
            : "LocalStorage Fallback",
        );
        setIsDatabaseBootstrapped(true);
        handleDataChange();
      }

      // Check customer deep-link query parameters.
      // Examples for LINE Rich Menu:
      // /customer/im-sticker?tab=rewards
      // /customer/im-sticker?tab=history
      // /customer/im-sticker?code=CPN-IS-50-ABCDE
      const code = searchParams.get("code");
      const tabParam = searchParams.get("tab") as CustomerTab | null;
      const allowedTabs: CustomerTab[] = ["home", "rewards", "code", "history", "profile"];

      if (tabParam && allowedTabs.includes(tabParam)) {
        setInitialCustomerTab(tabParam);
        setActiveRole("customer");
      }

      if (code) {
        setInitialCouponCode(code);
        setInitialCustomerTab("code");
        setActiveRole("customer");
      }

      if (code || tabParam || shouldResetLine || hasLiffState) {
        // Clean entry parameters after bootstrap to avoid re-triggering on refresh.
        cleanCustomerEntryQuery(searchParams);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTriggerSimulatedLink = (code: string) => {
    setInitialCouponCode(code);
    setActiveRole("customer");
  };

  // Fetch some metrics to display in the sticky top pilot deck
  const pendingClaimsCount = getTransactions().filter(
    (t) => t.status === "pending" && t.type === "redeem",
  ).length;
  const pendingShopsCount = getShops().filter(
    (s) => s.registrationStatus === "pending",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none antialiased">
      {/* 🚀 Sticky Global Pilot Control Deck - shown only on the prototype demo route */}
      {isDemoMode && (
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Logo Brand Brand */}
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-white font-extrabold text-[11px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                CRM 2026
              </span>
              <div>
                <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  หน้าทดสอบระบบสะสมแต้ม iM Sticker
                </h1>
                <span className="text-[10px] text-slate-500 font-mono font-medium">
                  ใช้สำหรับทีมงานทดสอบก่อนเปิดใช้งานจริง
                </span>
              </div>
            </div>

            {/* Core Interactive Switch Roles Panel */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80 gap-1 select-none">
              <button
                onClick={() => setActiveRole("customer")}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition duration-150 relative cursor-pointer ${activeRole === "customer" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${activeRole === "customer" ? "bg-white animate-pulse" : "bg-emerald-500"}`}
                />
                📱 หน้าลูกค้า
              </button>

              <button
                onClick={() => setActiveRole("owner")}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition duration-150 relative cursor-pointer ${activeRole === "owner" ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`}
              >
                {pendingClaimsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                    {pendingClaimsCount}
                  </span>
                )}
                <Store className="w-3.5 h-3.5" />
                🏬 หลังบ้านร้านค้า
              </button>

              <button
                onClick={() => setActiveRole("webmaster")}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition duration-150 relative cursor-pointer ${activeRole === "webmaster" ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`}
              >
                {pendingShopsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-violet-400 text-neutral-950 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                    {pendingShopsCount}
                  </span>
                )}
                <Shield className="w-3.5 h-3.5" />
                🛡️ ผู้ดูแลระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💡 Role Contextual Tutorial Bar - shown only on the prototype demo route */}
      {isDemoMode && (
        <div className="bg-white border-b border-slate-200/60 py-2.5 px-4 text-xs text-slate-600 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-650">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse flex-shrink-0" />

              {activeRole === "customer" && (
                <span>
                  ทดสอบมุมมองลูกค้า ลองดูแต้ม แลกรางวัล หรือรับแต้มจากรหัสที่ร้านสร้างไว้
                </span>
              )}
              {activeRole === "owner" && (
                <span>
                  ทดสอบมุมมองเจ้าของร้าน ใช้จัดการสมาชิก แจกแต้ม สร้างรางวัล และตรวจคำขอแลกรางวัล
                </span>
              )}
              {activeRole === "webmaster" && (
                <span>
                  ทดสอบมุมมองผู้ดูแลระบบ ใช้ดูสถานะระบบ ลิงก์ LINE OA และข้อมูลภาพรวมของร้าน
                </span>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
              <span>ฐานข้อมูล: {databaseLabel}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {!isDemoMode && activeRole !== "customer" && (
        <header className="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                iM Sticker Loyalty
              </p>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
                {activeRole === "owner" ? "หลังบ้านร้านค้า" : "ผู้ดูแลระบบ"}
              </h1>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
              <span>{activeRole === "owner" ? "จัดการแต้มและของรางวัล" : "ตรวจความพร้อมของระบบ"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </header>
      )}

      {!isDemoMode && !isDatabaseBootstrapped && (
        <main className="flex-1 flex items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Activity className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="mt-4 text-sm font-black text-slate-950">กำลังโหลดข้อมูลล่าสุดจากฐานข้อมูล</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">ระบบจะไม่แสดงข้อมูลจาก cache เก่าก่อนโหลด Neon สำเร็จ เพื่อป้องกันชื่อ รูป และคะแนนค้างจากเครื่องเดิม</p>
          </div>
        </main>
      )}

      {/* Main Body View Layouts Grid Render */}
      {(isDemoMode || isDatabaseBootstrapped) && (
      <main
        className={`${isDemoMode ? "flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 flex flex-col justify-center" : activeRole === "customer" ? "flex-1 w-full bg-slate-50" : "flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 md:p-8 flex flex-col"}`}
      >
        {activeRole === "customer" && (
          <div
            className={`${isDemoMode ? "py-4 flex flex-col justify-center items-center" : "min-h-screen w-full"}`}
          >
            {/* Elegant Mobile frame container wrap on desktop view */}
            {isDemoMode && (
              <div className="text-center mb-4 space-y-1">
                <span className="text-[10px] tracking-wider uppercase opacity-40 font-mono text-slate-500 font-bold">
                  ตัวอย่างหน้าจอบนมือถือ
                </span>
                <p className="text-xs text-slate-500">
                  ตัวอย่างนี้ช่วยให้ดูได้ใกล้เคียงกับตอนเปิดใน LINE
                </p>
              </div>
            )}

            <CustomerDashboard
              currentCustomerId="cust_pilot_001"
              onDataChange={handleDataChange}
              selectedShopId={selectedShopId}
              setSelectedShopId={setSelectedShopId}
              initialCouponCode={initialCouponCode}
              clearInitialCouponCode={() => setInitialCouponCode("")}
              initialTab={initialCustomerTab}
              displayMode={isDemoMode ? "demo" : "production"}
              dataVersion={dataVersion}
              lineIdentity={lineIdentity}
              onLineIdentityChange={handleLineIdentityChange}
            />
          </div>
        )}

        {activeRole === "owner" && (
          <div className="max-w-5xl mx-auto w-full py-4 animate-fade-in">
            <OwnerDashboard
              key={`owner-${selectedShopId}`}
              onDataChange={handleDataChange}
              selectedShopId={selectedShopId}
              setSelectedShopId={setSelectedShopId}
              onTriggerSimulatedLink={handleTriggerSimulatedLink}
              displayMode={isDemoMode ? "demo" : "production"}
            />
          </div>
        )}

        {activeRole === "webmaster" && (
          <div className="max-w-5xl mx-auto w-full py-4 animate-fade-in">
            <WebmasterDashboard
              key={`master-${dataVersion}`}
              onDataChange={handleDataChange}
            />
          </div>
        )}
      </main>
      )}

      {/* Modern minimal footer bar */}
      {isDemoMode && (
        <footer className="bg-white border-t border-slate-200/80 py-5 px-6 text-center text-xs text-slate-500 shadow-2xs mt-auto">
          <p>
            © 2026 iM Sticker Loyalty. ใช้สำหรับทดสอบระบบสะสมแต้มก่อนเปิดใช้งานจริง
          </p>
        </footer>
      )}
    </div>
  );
}
