import { NextRequest, NextResponse } from 'next/server';
import { answerFruitMathGame } from '../../../../../lib/server/games/gameDb';
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
    const selectedAnswer = body?.selectedAnswer === null || body?.selectedAnswer === undefined
      ? null
      : Number(body.selectedAnswer);

    if (!sessionId || !shopId || !customerId || !Number.isInteger(questionIndex)) {
      return NextResponse.json({ ok: false, message: 'ข้อมูลคำตอบไม่ครบถ้วน' }, { status: 400 });
    }
    if (selectedAnswer !== null && !Number.isFinite(selectedAnswer)) {
      return NextResponse.json({ ok: false, message: 'คำตอบไม่ถูกต้อง' }, { status: 400 });
    }

    const result = await answerFruitMathGame({ sessionId, shopId, customerId, questionIndex, selectedAnswer });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'ส่งคำตอบไม่สำเร็จ' },
      { status: 400 },
    );
  }
}
