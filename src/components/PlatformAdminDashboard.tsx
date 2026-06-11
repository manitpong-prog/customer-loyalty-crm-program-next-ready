"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Clipboard,
  Database,
  ExternalLink,
  Gift,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Store,
  Ticket,
  Users,
} from "lucide-react";
import type { Customer, PromoBanner, Reward, Shop, Transaction } from "../types";
import { getDefaultCustomerPath, getDefaultMerchantPath, getDefaultShopId, getDefaultShopSlug } from "../lib/shopSlug";

type CountKey = "shops" | "customers" | "rewards" | "banners" | "transactions" | "coupons";

type HealthResponse = {
  ok: boolean;
  source: string;
  message?: string;
  counts?: Record<CountKey, number>;
};

type SnapshotResponse = {
  ok: boolean;
  source: string;
  seeded?: boolean;
  seedMode?: string;
  message?: string;
  data?: {
    shops: Shop[];
    customers: Customer[];
    rewards: Reward[];
    banners: PromoBanner[];
    transactions: Transaction[];
    coupons: unknown[];
  };
};

const defaultCounts: Record<CountKey, number> = {
  shops: 0,
  customers: 0,
  rewards: 0,
  banners: 0,
  transactions: 0,
  coupons: 0,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

interface PlatformAdminDashboardProps {
  adminEmail?: string;
}

export default function PlatformAdminDashboard({ adminEmail }: PlatformAdminDashboardProps) {
  const defaultShopId = getDefaultShopId();
  const defaultShopSlug = getDefaultShopSlug();
  const customerPath = getDefaultCustomerPath();
  const merchantPath = getDefaultMerchantPath();

  const [baseUrl, setBaseUrl] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setBaseUrl(origin || envUrl || "");
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [healthResponse, snapshotResponse] = await Promise.all([
        fetch("/api/db/health", { cache: "no-store" }),
        fetch("/api/db/snapshot", { cache: "no-store" }),
      ]);

      const nextHealth = (await healthResponse.json()) as HealthResponse;
      const nextSnapshot = (await snapshotResponse.json()) as SnapshotResponse;

      setHealth(nextHealth);
      setSnapshot(nextSnapshot);

      if (!nextHealth.ok) {
        setError(nextHealth.message || "ตรวจฐานข้อมูลไม่ผ่าน");
      } else if (!nextSnapshot.ok) {
        setError(nextSnapshot.message || "โหลดข้อมูลล่าสุดไม่สำเร็จ");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดสถานะระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const data = snapshot?.data;
  const counts = health?.counts || defaultCounts;
  const pilotShop = useMemo(() => {
    return data?.shops.find((shop) => shop.id === defaultShopId) || data?.shops[0];
  }, [data?.shops, defaultShopId]);

  const shopRewards = useMemo(() => {
    return (data?.rewards || []).filter((reward) => !pilotShop || reward.shopId === pilotShop.id);
  }, [data?.rewards, pilotShop]);

  const shopTransactions = useMemo(() => {
    return (data?.transactions || []).filter((transaction) => !pilotShop || transaction.shopId === pilotShop.id);
  }, [data?.transactions, pilotShop]);

  const shopBanners = useMemo(() => {
    return (data?.banners || []).filter((banner) => !pilotShop || !banner.shopId || banner.shopId === pilotShop.id);
  }, [data?.banners, pilotShop]);

  const pendingRedeems = shopTransactions.filter((transaction) => transaction.type === "redeem" && transaction.status === "pending").length;
  const completedEarnPoints = shopTransactions
    .filter((transaction) => transaction.type === "earn" && transaction.status === "completed")
    .reduce((sum, transaction) => sum + transaction.points, 0);
  const completedRedeemPoints = shopTransactions
    .filter((transaction) => transaction.type === "redeem" && transaction.status === "completed")
    .reduce((sum, transaction) => sum + transaction.points, 0);

  const customerUrl = baseUrl ? `${baseUrl}${customerPath}` : customerPath;
  const merchantUrl = baseUrl ? `${baseUrl}${merchantPath}` : merchantPath;
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || "";
  const liffBaseUrl = liffId ? `https://liff.line.me/${liffId}` : "";
  const healthUrl = baseUrl ? `${baseUrl}/api/db/health` : "/api/db/health";
  const snapshotUrl = baseUrl ? `${baseUrl}/api/db/snapshot` : "/api/db/snapshot";

  const buildCustomerUrl = (tab?: string) => {
    if (!tab || tab === "home") return customerUrl;
    return `${customerUrl}?tab=${tab}`;
  };

  const buildLiffUrl = (tab?: string) => {
    const targetTab = tab || "home";
    return liffBaseUrl ? `${liffBaseUrl}?tab=${targetTab}` : buildCustomerUrl(tab);
  };

  const richMenuLinks = [
    { label: "แต้มของฉัน", tab: "home", helper: "เปิดหน้าแรกและแต้มปัจจุบัน", url: buildLiffUrl("home"), webUrl: buildCustomerUrl("home") },
    { label: "ของรางวัล", tab: "rewards", helper: "เปิดรายการของรางวัลที่แลกได้", url: buildLiffUrl("rewards"), webUrl: buildCustomerUrl("rewards") },
    { label: "รับแต้ม", tab: "code", helper: "เปิดหน้าใส่รหัส/ลิงก์รับแต้ม", url: buildLiffUrl("code"), webUrl: buildCustomerUrl("code") },
    { label: "ประวัติ", tab: "history", helper: "เปิดประวัติรับแต้มและแลกรางวัล", url: buildLiffUrl("history"), webUrl: buildCustomerUrl("history") },
    { label: "โปรไฟล์", tab: "profile", helper: "เปิดข้อมูลสมาชิกและ LINE account", url: buildLiffUrl("profile"), webUrl: buildCustomerUrl("profile") },
  ];

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("copy-error");
      window.setTimeout(() => setCopied(""), 1600);
    }
  };

  const handleAdminLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  };

  const statCards = [
    {
      label: "ร้านค้าในระบบ",
      value: counts.shops,
      helper: pilotShop ? `ร้าน: ${pilotShop.name}` : "ยังไม่พบร้านทดสอบ",
      icon: Store,
    },
    {
      label: "สมาชิกทั้งหมด",
      value: counts.customers,
      helper: "สมาชิกที่มีอยู่ในระบบ",
      icon: Users,
    },
    {
      label: "ของรางวัล",
      value: counts.rewards,
      helper: `${shopRewards.length} รายการของร้านปัจจุบัน`,
      icon: Gift,
    },
    {
      label: "รายการแต้ม",
      value: counts.transactions,
      helper: `${pendingRedeems} รายการแลกรางวัลรอตรวจ`,
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">
                <ShieldCheck className="h-4 w-4" />
                ผู้ดูแลระบบ
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">ศูนย์ดูแลระบบ iM Sticker Loyalty</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  หน้านี้ใช้สำหรับตรวจความพร้อมของระบบ ดูจำนวนข้อมูลหลัก และคัดลอกลิงก์ที่ต้องใช้กับ LINE OA โดยผู้ดูแลเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {adminEmail && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-bold text-violet-800">
                  Admin: <span className="font-mono">{adminEmail}</span>
                </div>
              )}
              <button
                type="button"
                onClick={loadStatus}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                รีเฟรชสถานะ
              </button>
              <button
                type="button"
                onClick={handleAdminLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-extrabold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "กำลังออก..." : "ออกจากระบบ"}
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                กลับหน้าแรก
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${health?.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                <Database className="h-4 w-4" />
                สถานะฐานข้อมูล
              </div>
              <p className={`mt-2 text-lg font-black ${health?.ok ? "text-emerald-700" : "text-rose-700"}`}>
                {loading ? "กำลังตรวจสอบ..." : health?.ok ? "ฐานข้อมูลพร้อมใช้งาน" : "ต้องตรวจสอบ"}
              </p>
              <p className="mt-1 text-xs text-slate-600">แหล่งข้อมูล: {health?.source || "-"}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                <BadgeCheck className="h-4 w-4" />
                ร้านที่กำลังทดสอบ
              </div>
              <p className="mt-2 text-lg font-black text-amber-800">{pilotShop?.name || "ยังไม่พบร้าน"}</p>
              <p className="mt-1 text-xs text-slate-600">slug: {defaultShopSlug} / id: {pilotShop?.id || defaultShopId}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                <LockKeyhole className="h-4 w-4" />
                การเข้าสู่ระบบผู้ดูแล
              </div>
              <p className="mt-2 text-lg font-black text-slate-800">เข้าสู่ระบบด้วยอีเมลแล้ว</p>
              <p className="mt-1 text-xs text-slate-600">ระบบล้างข้อมูลควรปิดไว้: ALLOW_DB_RESET=false</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-mono text-slate-500">พร้อมใช้</span>
                </div>
                <p className="mt-5 text-xs font-bold text-slate-500">{card.label}</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{formatNumber(card.value)}</p>
                <p className="mt-2 min-h-9 text-xs leading-5 text-slate-500">{card.helper}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">LINE OA</p>
                <h2 className="mt-1 text-xl font-black">ลิงก์สำหรับผูกใน Rich Menu</h2>
              </div>
              <Smartphone className="h-8 w-8 text-emerald-500" />
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-emerald-900">ลิงก์หลักสำหรับลูกค้า</p>
                    <p className="mt-1 break-all font-mono text-xs text-emerald-700">{liffBaseUrl || customerUrl}</p>
                    <p className="mt-2 text-xs leading-5 text-emerald-800/80">
                      นำลิงก์นี้ไปใส่ปุ่มหลักใน Rich Menu ได้เลย
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => copyText("liff-main", liffBaseUrl || customerUrl)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                    >
                      <Clipboard className="h-4 w-4" />
                      {copied === "liff-main" ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                    <a href={liffBaseUrl || customerPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
                      เปิด <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">ปุ่มที่แนะนำใน Rich Menu</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      คัดลอก URL เหล่านี้ไปผูกใน LINE OA ได้ตามต้องการ ระบบรองรับ <span className="font-mono">?tab=...</span> และ <span className="font-mono">liff.state</span> แล้ว
                    </p>
                  </div>
                  {!liffBaseUrl && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                      ยังไม่ได้ตั้งค่า LIFF ID
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  {richMenuLinks.map((item) => (
                    <div key={item.tab} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.helper}</p>
                          <p className="mt-2 break-all font-mono text-[11px] text-slate-700">{item.url}</p>
                          {liffBaseUrl && (
                            <p className="mt-1 break-all font-mono text-[10px] text-slate-400">เว็บตรงสำรอง: {item.webUrl}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => copyText(`rich-${item.tab}`, item.url)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                          >
                            <Clipboard className="h-4 w-4" />
                            {copied === `rich-${item.tab}` ? "คัดลอกแล้ว" : "คัดลอก"}
                          </button>
                          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                            เปิด <ArrowRight className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-amber-950">หลังบ้านร้านค้า</p>
                    <p className="mt-1 break-all font-mono text-xs text-amber-800">{merchantUrl}</p>
                    <p className="mt-2 text-xs leading-5 text-amber-900/75">
                      ลิงก์นี้สำหรับเจ้าของร้านหรือทีมงานเท่านั้น ไม่ควรใส่ใน Rich Menu ลูกค้า
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => copyText("merchant", merchantUrl)}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-amber-700"
                    >
                      <Clipboard className="h-4 w-4" />
                      {copied === "merchant" ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                    <Link href={merchantPath} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50">
                      เปิด <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">ตรวจระบบ</p>
              <h2 className="mt-1 text-xl font-black">ทางลัดตรวจระบบ</h2>
            </div>
            <div className="mt-5 grid gap-3">
              <a href="/api/db/health" target="_blank" rel="noreferrer" className="group rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">ตรวจสถานะฐานข้อมูล</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">{healthUrl}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-violet-600" />
                </div>
              </a>
              <a href="/api/db/snapshot" target="_blank" rel="noreferrer" className="group rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">ดูข้อมูลล่าสุด</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">{snapshotUrl}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-violet-600" />
                </div>
              </a>
              <Link href="/demo" className="group rounded-2xl border border-slate-200 p-4 transition hover:border-sky-200 hover:bg-sky-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">หน้าเทสต์ภายใน</p>
                    <p className="mt-1 text-xs text-slate-500">ยังซ่อนไว้สำหรับทดสอบภายใน</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600" />
                </div>
              </Link>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              <h2 className="text-xl font-black">ภาพรวมร้าน iM Sticker</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">แต้มที่แจกแล้ว</p>
                <p className="mt-2 text-2xl font-black text-emerald-700">{formatNumber(completedEarnPoints)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">แต้มที่ใช้แลกแล้ว</p>
                <p className="mt-2 text-2xl font-black text-rose-700">{formatNumber(completedRedeemPoints)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">คูปองรับแต้ม</p>
                <p className="mt-2 text-2xl font-black text-amber-700">{formatNumber(counts.coupons)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">แบนเนอร์/โปรโมชัน</p>
                <p className="mt-2 text-2xl font-black text-violet-700">{formatNumber(shopBanners.length)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-black">ข้อมูลร้าน</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p><span className="font-bold text-slate-900">ชื่อร้าน:</span> {pilotShop?.name || "-"}</p>
                <p><span className="font-bold text-slate-900">สถานะ:</span> {pilotShop?.registrationStatus || "-"}</p>
                <p><span className="font-bold text-slate-900">เบอร์โทร:</span> {pilotShop?.phone || "-"}</p>
                <p><span className="font-bold text-slate-900">สร้างเมื่อ:</span> {formatDate(pilotShop?.createdAt)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-black">ลำดับงานถัดไป</h2>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                <p className="font-black">ตรวจหน้าลูกค้า</p>
                <p className="mt-1">เปิด /customer/im-sticker ผ่าน LINE แล้วเช็กว่า Login, แต้ม และเมนูต่าง ๆ ใช้งานได้ลื่น</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4 text-amber-950">
                <p className="font-black">ตรวจหลังบ้านร้าน</p>
                <p className="mt-1">ลองเพิ่มสมาชิก แจกแต้ม สร้างของรางวัล และยืนยันรายการแลกรางวัลจาก /merchant/im-sticker</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4 text-sky-950">
                <p className="font-black">ทดสอบ Rich Menu</p>
                <p className="mt-1">นำลิงก์ด้านบนไปผูกใน LINE OA แล้วทดสอบกับมือถือจริงก่อนเปิดให้ลูกค้าใช้</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
