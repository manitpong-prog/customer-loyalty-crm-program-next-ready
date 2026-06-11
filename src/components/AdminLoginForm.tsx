"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

type AdminLoginFormProps = {
  nextPath?: string;
};

function sanitizeNextPath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/admin";
  if (path.startsWith("/admin/login")) return "/admin";
  return path;
}

export default function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const router = useRouter();
  const safeNextPath = useMemo(() => sanitizeNextPath(nextPath), [nextPath]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const response = await fetch("/api/admin/me", { cache: "no-store" });
        if (response.ok) {
          router.replace(safeNextPath);
          return;
        }
      } catch {
        // ignore and show the login form
      } finally {
        setIsChecking(false);
      }
    };

    checkExistingSession();
  }, [router, safeNextPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.ok) {
        setError(payload?.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      router.replace(safeNextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เชื่อมต่อระบบ login ไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.18),transparent_30%),linear-gradient(180deg,#020617_0%,#111827_100%)]" />
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
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-700 shadow-lg">
                <ShieldCheck className="h-7 w-7 text-white" />
              </div>
              <p className="text-xs font-mono uppercase tracking-[0.28em] text-slate-400">ผู้ดูแลระบบ</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight">เข้าสู่ระบบ</h1>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Admin ของระบบแยกจาก LINE Login แล้ว ใช้ email/password ผ่าน browser ปกติเท่านั้น ตาม policy ของระบบ pilot
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-xs leading-6 text-emerald-100">
              ลูกค้าและเจ้าของร้านใช้ LINE Login ส่วน ผู้ดูแลระบบ ใช้ session ฝั่ง server ด้วย HttpOnly cookie
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col justify-center rounded-[1.5rem] bg-white p-6 text-slate-950 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Email Login</p>
                <h2 className="text-xl font-black">ผู้ดูแลระบบ เท่านั้น</h2>
              </div>
            </div>

            {isChecking ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
                กำลังตรวจสอบการเข้าสู่ระบบ...
              </div>
            ) : (
              <>
                <label className="text-xs font-extrabold text-slate-600" htmlFor="admin-email">
                  อีเมลผู้ดูแล
                </label>
                <input
                  id="admin-email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  type="email"
                  autoComplete="username"
                  placeholder="admin@example.com"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none transition focus:border-slate-950 focus:bg-white"
                />

                <label className="mt-4 text-xs font-extrabold text-slate-600" htmlFor="admin-password">
                  รหัสผ่าน
                </label>
                <input
                  id="admin-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  type="password"
                  autoComplete="current-password"
                  placeholder="กรอกรหัสผ่าน"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none transition focus:border-slate-950 focus:bg-white"
                />

                {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>

                <p className="mt-5 text-xs leading-6 text-slate-500">
                  บัญชีผู้ดูแลตั้งค่าไว้ใน Vercel Environment Variables <br />
                  <span className="font-mono font-bold text-slate-700">ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET</span>
                </p>
              </>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
