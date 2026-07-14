"use client";

import React, { useEffect, useState } from "react";
import { Gamepad2, RefreshCw, Save, Ticket } from "lucide-react";
import type { MiniGameConfig } from "../../types";

type Props = {
  shopId: string;
};

type SettingsResponse = {
  ok?: boolean;
  message?: string;
  config?: MiniGameConfig;
};

export default function GameSettingsPanel({ shopId }: Props) {
  const [config, setConfig] = useState<MiniGameConfig | null>(null);
  const [entryPoints, setEntryPoints] = useState("10");
  const [dailyPlayLimit, setDailyPlayLimit] = useState("3");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadSettings = async () => {
    if (!shopId) return;
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/db/games/settings?shopId=${encodeURIComponent(shopId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as SettingsResponse | null;
      if (!response.ok || !payload?.ok || !payload.config) {
        throw new Error(payload?.message || "โหลดการตั้งค่าเกมไม่สำเร็จ");
      }

      setConfig(payload.config);
      setEntryPoints(String(payload.config.entryPoints));
      setDailyPlayLimit(String(payload.config.dailyPlayLimit));
      setIsActive(payload.config.isActive);
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : "โหลดการตั้งค่าเกมไม่สำเร็จ"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, [shopId]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedEntryPoints = Number(entryPoints);
    const parsedDailyPlayLimit = Number(dailyPlayLimit);

    if (!Number.isInteger(parsedEntryPoints) || parsedEntryPoints <= 0) {
      setMessage("❌ ค่าเข้าเล่นต้องเป็นเลขจำนวนเต็มมากกว่า 0");
      return;
    }
    if (!Number.isInteger(parsedDailyPlayLimit) || parsedDailyPlayLimit <= 0) {
      setMessage("❌ จำนวนครั้งต่อวันต้องเป็นเลขจำนวนเต็มมากกว่า 0");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/db/games/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          entryPoints: parsedEntryPoints,
          dailyPlayLimit: parsedDailyPlayLimit,
          isActive,
        }),
      });
      const payload = (await response.json().catch(() => null)) as SettingsResponse | null;
      if (!response.ok || !payload?.ok || !payload.config) {
        throw new Error(payload?.message || "บันทึกการตั้งค่าเกมไม่สำเร็จ");
      }
      setConfig(payload.config);
      setMessage("✓ บันทึกการตั้งค่า Fruit Math Slash แล้ว");
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : "บันทึกการตั้งค่าเกมไม่สำเร็จ"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-lg">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-700">Mini game</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Fruit Math Slash</h3>
              <p className="mt-1 max-w-xl text-xs font-semibold leading-relaxed text-slate-600">
                ลูกค้าใช้แต้มเพื่อเล่นโจทย์บวกและลบ 3 จำนวน ตอบถูกครบ 8 ข้อก่อนผิดครบ 3 ข้อ จะได้รับ Reward Ticket 1 ใบ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-2 text-[11px] font-black text-orange-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> โหลดใหม่
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-black text-slate-950">กติกาเกมเวอร์ชันแรก</h4>
          <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
            {[
              ["โจทย์", "3 จำนวน ใช้เฉพาะ + และ -"],
              ["ชนะ", "ตอบถูกครบ 8 ข้อ"],
              ["แพ้", "ตอบผิดหรือหมดเวลาครบ 3 ข้อ"],
              ["ข้อ 1–3", "7 วินาที • ผลไม้ 4 ลูก"],
              ["ข้อ 4–6", "6 วินาที • ผลไม้ 6 ลูก"],
              ["ข้อ 7–10", "5 วินาที • ผลไม้ 8 ลูก"],
              ["การควบคุม", "แตะผลไม้ที่เป็นคำตอบ"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-2.5">
                <span className="font-black text-slate-800">{label}</span>
                <span className="text-right">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-xs font-bold text-violet-800">
            <Ticket className="h-5 w-5 shrink-0" />
            ชนะ 1 รอบ รับ 1 Ticket ซึ่งหมดอายุใน 30 วัน
          </div>
        </section>

        <form onSubmit={saveSettings} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="text-sm font-black text-slate-950">ตั้งค่าที่ร้านเปลี่ยนได้</h4>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">กติกาความยากยังล็อกไว้ตาม Game Design เพื่อให้ทุกคนเล่นอย่างยุติธรรม</p>

          {loading ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-500">กำลังโหลดการตั้งค่าเกม...</div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-black text-slate-700">ค่าเข้าเล่นต่อรอบ (แต้ม)</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={entryPoints}
                  onChange={(event) => setEntryPoints(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-950 outline-none focus:border-orange-400"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-black text-slate-700">จำนวนครั้งสูงสุดต่อคนต่อวัน</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={dailyPlayLimit}
                  onChange={(event) => setDailyPlayLimit(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-950 outline-none focus:border-orange-400"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <span className="block text-[11px] font-black text-slate-800">เปิดให้ลูกค้าเล่นเกม</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">ปิดได้ชั่วคราวโดยไม่ลบประวัติและ Ticket</span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5 accent-orange-600"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-xs font-black text-white disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" /> {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าเกม"}
              </button>
            </div>
          )}

          {message && (
            <div className={`mt-4 rounded-2xl border p-3 text-xs font-bold ${message.startsWith("✓") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
              {message}
            </div>
          )}

          {config && (
            <p className="mt-3 text-[9px] font-mono font-bold text-slate-400">
              อัปเดตล่าสุด: {new Date(config.updatedAt).toLocaleString("th-TH")}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
