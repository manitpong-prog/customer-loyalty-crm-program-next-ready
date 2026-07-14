import { NextRequest, NextResponse } from 'next/server';
import { getGameState, updateGameSettings } from '../../../../../lib/server/games/gameDb';
import { isDatabaseConfigured } from '../../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, message: 'DATABASE_URL is not configured.' }, { status: 503 });
  const shopId = String(request.nextUrl.searchParams.get('shopId') || '').trim();
  if (!shopId) return NextResponse.json({ ok: false, message: 'Missing shopId.' }, { status: 400 });
  try {
    const state = await getGameState({ shopId });
    return NextResponse.json({ ok: true, config: state.config });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'โหลดการตั้งค่าเกมไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, message: 'DATABASE_URL is not configured.' }, { status: 503 });
  try {
    const body = await request.json();
    const shopId = String(body?.shopId || '').trim();
    const entryPoints = Number(body?.entryPoints);
    const dailyPlayLimit = Number(body?.dailyPlayLimit);
    const isActive = body?.isActive !== false;
    if (!shopId || !Number.isInteger(entryPoints) || entryPoints <= 0 || !Number.isInteger(dailyPlayLimit) || dailyPlayLimit <= 0) {
      return NextResponse.json({ ok: false, message: 'กรุณากรอกค่าเข้าเล่นและจำนวนครั้งต่อวันเป็นเลขจำนวนเต็มมากกว่า 0' }, { status: 400 });
    }
    const config = await updateGameSettings({ shopId, entryPoints, dailyPlayLimit, isActive });
    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'บันทึกการตั้งค่าเกมไม่สำเร็จ' }, { status: 500 });
  }
}
