import { NextRequest, NextResponse } from 'next/server';
import { startFruitMathGame } from '../../../../../lib/server/games/gameDb';
import { isDatabaseConfigured } from '../../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'DATABASE_URL is not configured. เกมออนไลน์ต้องใช้ Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const shopId = String(body?.shopId || '').trim();
    const customerId = String(body?.customerId || '').trim();
    if (!shopId || !customerId) {
      return NextResponse.json({ ok: false, message: 'Missing shopId or customerId.' }, { status: 400 });
    }

    const result = await startFruitMathGame({ shopId, customerId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'เริ่มเกมไม่สำเร็จ' },
      { status: 400 },
    );
  }
}
