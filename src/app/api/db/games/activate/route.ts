import { NextRequest, NextResponse } from 'next/server';
import { activateFruitMathQuestion } from '../../../../../lib/server/games/gameDb';
import { isDatabaseConfigured } from '../../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'DATABASE_URL is not configured. เกมออนไลน์ต้องใช้ Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const sessionId = String(body?.sessionId || '').trim();
    const shopId = String(body?.shopId || '').trim();
    const customerId = String(body?.customerId || '').trim();
    const questionIndex = Number(body?.questionIndex);

    if (!sessionId || !shopId || !customerId || !Number.isInteger(questionIndex)) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลเริ่มจับเวลาไม่ครบถ้วน' }, { status: 400 });
    }

    const result = await activateFruitMathQuestion({ sessionId, shopId, customerId, questionIndex });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'เริ่มจับเวลาโจทย์ไม่สำเร็จ' },
      { status: 400 },
    );
  }
}
