import { NextRequest, NextResponse } from 'next/server';
import { abandonFruitMathGame } from '../../../../../lib/server/games/gameDb';
import { isDatabaseConfigured } from '../../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'DATABASE_URL is not configured.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId || '').trim();
    const shopId = String(body?.shopId || '').trim();
    const customerId = String(body?.customerId || '').trim();
    if (!sessionId || !shopId || !customerId) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลรอบเกมไม่ครบถ้วน' }, { status: 400 });
    }

    const result = await abandonFruitMathGame({ sessionId, shopId, customerId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'ออกจากเกมไม่สำเร็จ' },
      { status: 400 },
    );
  }
}
