"use client";

import React, { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck, Store, Wrench } from "lucide-react";
import LineLoginPanel from "./LineLoginPanel";
import type { LineIdentity } from "../lib/lineAuth";
import { readStoredLineIdentity } from "../lib/lineAuth";

type AccessArea = "merchant" | "admin" | "demo";

interface AccessGateProps {
  area: AccessArea;
  children: ReactNode;
  shopId?: string;
}

const areaConfig = {
  merchant: {
    title: "เข้าหลังบ้านร้านค้า",
    subtitle: "สำหรับเจ้าของร้านหรือทีมงานที่ได้รับอนุญาต",
    label: "Merchant PIN",
    storageKey: "im_crm_merchant_access_granted",
    defaultPin: "1234",
    envPin: process.env.NEXT_PUBLIC_MERCHANT_ACCESS_PIN,
    icon: Store,
    accent: "from-amber-400 to-orange-600",
    helper:
      "ระยะนี้เป็น PIN แบบง่ายสำหรับกันผู้ใช้ทั่วไปเข้าโดยไม่ตั้งใจ รอบถัดไปควรเปลี่ยนเป็นระบบ login จริง",
  },
  admin: {
    title: "ผู้ดูแลระบบ",
    subtitle: "สำหรับผู้ดูแลแพลตฟอร์มเท่านั้น",
    label: "Admin PIN",
    storageKey: "im_crm_admin_access_granted",
    defaultPin: "admin1234",
    envPin: process.env.NEXT_PUBLIC_ADMIN_ACCESS_PIN,
    icon: ShieldCheck,
    accent: "from-violet-400 to-fuchsia-700",
    helper:
      "หน้าผู้ดูแลระบบควรถูกใช้เฉพาะคนดูแลระบบ ใน Production จริงควรเปลี่ยนเป็น auth ฝั่ง server",
  },
  demo: {
    title: "Prototype Debug Mode",
    subtitle: "หน้า debug ภายในสำหรับทดสอบทุกบทบาทในหน้าจอเดียว",
    label: "Demo PIN",
    storageKey: "im_crm_demo_access_granted",
    defaultPin: "demo2026",
    envPin: process.env.NEXT_PUBLIC_DEMO_ACCESS_PIN,
    icon: Wrench,
    accent: "from-sky-400 to-indigo-700",
    helper:
      "หน้านี้ถูกซ่อนจากหน้าแรกแล้ว เหลือไว้สำหรับตรวจระบบภายในเท่านั้น",
  },
} satisfies Record<AccessArea, {
  title: string;
  subtitle: string;
  label: string;
  storageKey: string;
  defaultPin: string;
  envPin?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  helper: string;
}>;

export default function AccessGate({ area, children, shopId }: AccessGateProps) {
  const config = areaConfig[area];
  const accessPin = useMemo(() => config.envPin || config.defaultPin, [config.defaultPin, config.envPin]);
  const [isChecking, setIsChecking] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [lineIdentity, setLineIdentity] = useState<LineIdentity | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const Icon = config.icon;

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const storedIdentity = readStoredLineIdentity();
        if (storedIdentity) {
          setLineIdentity(storedIdentity);

          if (area === "merchant" && shopId && storedIdentity.ownerShopIds?.includes(shopId)) {
            setIsUnlocked(true);
            return;
          }
        }

        const granted = window.sessionStorage.getItem(config.storageKey) === "true";
        setIsUnlocked(granted);
      } catch {
        setIsUnlocked(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [area, config.storageKey, shopId]);

  const handleLineIdentityChange = (identity: LineIdentity | null) => {
    setLineIdentity(identity);

    if (area === "merchant" && shopId && identity?.ownerShopIds?.includes(shopId)) {
      try {
        window.sessionStorage.setItem(config.storageKey, "true");
      } catch {
        // ignore
      }
      setIsUnlocked(true);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pin.trim() !== accessPin) {
      setError("รหัสไม่ถูกต้อง กรุณาลองอีกครั้ง");
      setPin("");
      return;
    }

    try {
      window.sessionStorage.setItem(config.storageKey, "true");
    } catch {
      // If sessionStorage is unavailable, still unlock for the current render.
    }

    setError("");
    setIsUnlocked(true);
  };

  if (isChecking) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20">
          กำลังตรวจสอบสิทธิ์...
        </div>
      </main>
    );
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.24),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-5 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/[0.12]"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าแรก
        </Link>

        <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/25 backdrop-blur md:grid-cols-[0.95fr_1.05fr] md:p-8">
          <div className="flex flex-col justify-between rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-6">
            <div>
              <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${config.accent} shadow-lg`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <p className="text-xs font-mono uppercase tracking-[0.28em] text-slate-400">Access Control</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">{config.title}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-300">{config.subtitle}</p>
            </div>

            <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-6 text-amber-100">
              {config.helper}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            {area === "merchant" && shopId && (
              <LineLoginPanel
                context="merchant"
                shopId={shopId}
                onAuthenticated={handleLineIdentityChange}
              />
            )}

          <form onSubmit={handleSubmit} className="flex flex-col justify-center rounded-[1.5rem] bg-white p-6 text-slate-950 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Protected Area</p>
                <h2 className="text-xl font-black">กรอกรหัสเพื่อเข้าใช้งาน</h2>
              </div>
            </div>

            <label className="text-xs font-extrabold text-slate-600" htmlFor={`${area}-pin`}>
              {config.label}
            </label>
            <input
              id={`${area}-pin`}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value);
                setError("");
              }}
              type="password"
              inputMode="text"
              autoComplete="off"
              placeholder="กรอกรหัส PIN"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none transition focus:border-slate-950 focus:bg-white"
            />

            {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{error}</p>}

            <button
              type="submit"
              className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              เข้าใช้งาน
            </button>

            <p className="mt-5 text-xs leading-6 text-slate-500">
              ค่า PIN ตั้งได้จาก Vercel Environment Variables: <br />
              <span className="font-mono font-bold text-slate-700">
                {area === "merchant" ? "NEXT_PUBLIC_MERCHANT_ACCESS_PIN" : area === "admin" ? "NEXT_PUBLIC_ADMIN_ACCESS_PIN" : "NEXT_PUBLIC_DEMO_ACCESS_PIN"}
              </span>
            </p>
          </form>
          </div>
        </section>
      </div>
    </main>
  );
}
