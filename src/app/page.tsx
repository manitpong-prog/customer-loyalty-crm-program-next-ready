import Link from 'next/link';
import { getDefaultCustomerPath, getDefaultMerchantPath } from '../lib/shopSlug';
import { ArrowRight, BadgeCheck, BarChart3, LockKeyhole, ShieldCheck, Smartphone, Store } from 'lucide-react';

const primaryActions = [
  {
    href: getDefaultCustomerPath(),
    title: 'เข้าหน้าลูกค้า',
    description: 'ดูบัตรสมาชิก แต้มสะสม ของรางวัล และประวัติการใช้งาน',
    icon: Smartphone,
    badge: 'Customer',
  },
  {
    href: getDefaultMerchantPath(),
    title: 'เข้าหลังบ้านร้านค้า',
    description: 'จัดการลูกค้า แต้มสะสม คูปอง รางวัล และรายการของร้าน',
    icon: Store,
    badge: 'Merchant',
  },
  {
    href: '/admin',
    title: 'ผู้ดูแลระบบ',
    description: 'สำหรับผู้ดูแลระบบ ใช้ตรวจสถานะและลิงก์สำคัญของร้าน',
    icon: ShieldCheck,
    badge: 'Admin',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.2),transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-black shadow-lg shadow-amber-500/20">
              CRM
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.28em] text-emerald-300">
                iM Sticker Loyalty
              </p>
              <h1 className="text-base font-extrabold tracking-tight sm:text-lg">
                ระบบสะสมแต้ม iM Sticker
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            พร้อมทดลองใช้งาน
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              พร้อมทดลองใช้กับ LINE OA
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                ระบบสะสมแต้มของ iM Sticker
              </h2>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                เลือกเข้าใช้งานตามบทบาทของคุณ ลูกค้าเปิดดูแต้มได้ทันที เจ้าของร้านจัดการแต้มและของรางวัล ส่วนผู้ดูแลระบบใช้ตรวจความพร้อมของระบบ
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {primaryActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-white/[0.12]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-slate-900/70 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                  <div className="mt-6 space-y-2">
                    <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                    <p className="min-h-16 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-sm font-extrabold text-emerald-300">
                    เข้าใช้งาน
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 text-sm text-slate-300 backdrop-blur md:grid-cols-[1.15fr_0.85fr]">
            <div className="flex gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <p className="font-bold text-white">สถานะตอนนี้</p>
                <p className="mt-1 leading-6">
                  ระบบเชื่อมฐานข้อมูลจริงแล้ว และตั้งค่าร้าน iM Sticker เป็นร้านทดสอบหลักเรียบร้อย
                </p>
              </div>
            </div>
            <div className="flex gap-3 md:justify-end">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div className="md:text-right">
                <p className="font-bold text-white">การเข้าใช้งาน</p>
                <p className="mt-1 leading-6">
                  ลูกค้าและเจ้าของร้านใช้ LINE Login ส่วนผู้ดูแลระบบเข้าใช้งานด้วยอีเมลและรหัสผ่าน
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
