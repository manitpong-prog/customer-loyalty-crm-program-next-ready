import { NextRequest, NextResponse } from 'next/server';
import { adjustCustomerPointsOnline, isDatabaseConfigured } from '../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PointAdjustmentPayload = {
  customerId?: string;
  shopId?: string;
  adjustmentType?: 'add' | 'deduct';
  points?: number | string;
  reason?: string;
};

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'ยังไม่ได้ตั้งค่า DATABASE_URL จึงไม่สามารถปรับแต้มแบบออนไลน์เท่านั้นได้' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as PointAdjustmentPayload;
    const customerId = String(body?.customerId || '').trim();
    const shopId = String(body?.shopId || '').trim();
    const adjustmentType = body?.adjustmentType;
    const points = Number(body?.points);
    const reason = String(body?.reason || '').trim();

    if (!customerId || !shopId || (adjustmentType !== 'add' && adjustmentType !== 'deduct') || !Number.isFinite(points) || points <= 0) {
      return NextResponse.json(
        { ok: false, message: 'ข้อมูลปรับแต้มไม่ครบ กรุณาลองใหม่อีกครั้ง' },
        { status: 400 },
      );
    }

    const result = await adjustCustomerPointsOnline({
      customerId,
      shopId,
      adjustmentType,
      points,
      reason,
    });

    return NextResponse.json({ ok: true, source: 'neon', ...result });
  } catch (error) {
    console.error('[crm-db:point-adjustment]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown point adjustment error' },
      { status: 500 },
    );
  }
}
