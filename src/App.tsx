"use client";

import React, { useState, useEffect } from "react";
import {
  initializeDatabase,
  getShops,
  getCustomers,
  getTransactions,
} from "./data/mockData";
import CustomerDashboard from "./components/CustomerDashboard";
import OwnerDashboard from "./components/OwnerDashboard";
import WebmasterDashboard from "./components/WebmasterDashboard";
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

interface AppProps {
  initialRole?: AppRole;
  mode?: AppMode;
}

export default function App({
  initialRole = "customer",
  mode = "demo",
}: AppProps) {
  const isDemoMode = mode === "demo";
  const [activeRole, setActiveRole] = useState<AppRole>(initialRole);
  const [dataVersion, setDataVersion] = useState(0);
  const defaultShopId = process.env.NEXT_PUBLIC_DEFAULT_SHOP_ID || "im_sticker";
  const [selectedShopId, setSelectedShopId] = useState(defaultShopId);
  const [initialCouponCode, setInitialCouponCode] = useState<string>("");
  const [databaseLabel, setDatabaseLabel] = useState("กำลังเชื่อมต่อข้อมูล...");

  // Triggered when static storage modifies of children
  const handleDataChange = () => {
    setDataVersion((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      // Bootstrap CRM state from Neon first. If Neon is not configured or unreachable,
      // the app continues with the local browser cache fallback.
      const result = await initializeDatabase();

      if (!isMounted) return;

      setDatabaseLabel(
        result.source === "neon"
          ? "Neon PostgreSQL + Local Cache"
          : "LocalStorage Fallback",
      );
      handleDataChange();

      // Check for '?code=...' query parameter in window URL
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (code) {
        setInitialCouponCode(code);
        setActiveRole("customer");
        // Clean query parameter from address bar cleanly
        try {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {
          console.error("Failed to clean URL", e);
        }
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
                  ระบบสะสมแต้ม Loyalty Program MiniApp สลับสิทธิ์
                </h1>
                <span className="text-[10px] text-slate-500 font-mono font-medium">
                  Platform Integration Prototype (LINE OA & Browser Multi-User)
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
                📱 1. หน้าบ้านลูกค้า (Line OA MiniApp)
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
                🏬 2. หลังบ้านร้านค้า (B2B Control)
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
                🛡️ 3. ผู้ดูแลเว็ปไซต์ (Webmaster System)
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
                  💡 **หน้าสมาร์ทโฟนจําลองลูกค้า**: คุณเข้าใช้งานในฐานะลูกค้า
                  VIP ของแบรนด์ ลองกด **"แลกรางวัล"** หรือสแกนเพื่อรับแต้ม
                  และลองไปกดอนุมัติที่หลังบ้านร้านค้าได้เลย!
                </span>
              )}
              {activeRole === "owner" && (
                <span>
                  💡 **หน้าร้านค้าแอดมิน**: ควบคุมสาขา จัดระเบียบแต้ม กด
                  **อนุมัติบิลการแลกสินค้า** ด้านบน หรือคลิกสร้างคิวอาร์แจกแต้ม
                  แล้วลองเข้าไปดูผลลัพธ์หน้ามือถือลูกค้า!
                </span>
              )}
              {activeRole === "webmaster" && (
                <span>
                  💡 **หน้าเว็ปบอร์ดแอดมิน**:
                  ตรวจสอบคำขอร่วมแฟรนไชส์แบรนด์และยอดข้อมูลแพลตฟอร์ม CRM
                  ทั้งระบบ สมัครร้านค้าเสร็จจะไปปรากฏให้เปิดสะสมแต้ม!
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
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400">
                CRM 2026
              </p>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
                {activeRole === "owner" ? "หลังบ้านร้านค้า" : "ผู้ดูแลเว็บไซต์"}
              </h1>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
              <span>ฐานข้อมูล: {databaseLabel}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </header>
      )}

      {/* Main Body View Layouts Grid Render */}
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
                  Mobile Simulated Device Iframe Layout
                </span>
                <p className="text-xs text-slate-500">
                  หน้าจอนี้ปรับขนาดแสดงผลสัดส่วนเหมาะสมกับโมบายล์สกรีน LINE LIFF
                </p>
              </div>
            )}

            <CustomerDashboard
              key={`cust-${dataVersion}`}
              currentCustomerId="cust_pilot_001"
              onDataChange={handleDataChange}
              selectedShopId={selectedShopId}
              setSelectedShopId={setSelectedShopId}
              initialCouponCode={initialCouponCode}
              clearInitialCouponCode={() => setInitialCouponCode("")}
              displayMode={isDemoMode ? "demo" : "production"}
            />
          </div>
        )}

        {activeRole === "owner" && (
          <div className="max-w-5xl mx-auto w-full py-4 animate-fade-in">
            <OwnerDashboard
              key={`owner-${selectedShopId}-${dataVersion}`}
              onDataChange={handleDataChange}
              selectedShopId={selectedShopId}
              setSelectedShopId={setSelectedShopId}
              onTriggerSimulatedLink={handleTriggerSimulatedLink}
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

      {/* Modern minimal footer bar */}
      {isDemoMode && (
        <footer className="bg-white border-t border-slate-200/80 py-5 px-6 text-center text-xs text-slate-500 shadow-2xs mt-auto">
          <p>
            © 2026 CRM Customer Loyalty Platform.
            โครงร่างสร้างเว็บแอพสะสมแต้มพรีเมี่ยมยุคใหม่
          </p>
        </footer>
      )}
    </div>
  );
}
