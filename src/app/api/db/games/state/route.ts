import { NextRequest, NextResponse } from 'next/server';
import { getGameState } from '../../../../../lib/server/games/gameDb';
import { isDatabaseConfigured } from '../../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'DATABASE_URL is not configured. เกมออนไลน์ต้องใช้ Neon.' }, { status: 503 });
  }

  const shopId = String(request.nextUrl.searchParams.get('shopId') || '').trim();
  const customerId = String(request.nextUrl.searchParams.get('customerId') || '').trim();
  if (!shopId) return NextResponse.json({ ok: false, message: 'Missing shopId.' }, { status: 400 });

  try {
    const state = await getGameState({ shopId, customerId: customerId || undefined });
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'โหลดข้อมูลเกมไม่สำเร็จ' },
      { status: 500 },
    );
  }
}
