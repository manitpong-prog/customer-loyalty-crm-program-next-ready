import { NextRequest, NextResponse } from 'next/server';
import { claimPointCouponOnline, isDatabaseConfigured } from '../../../../lib/server/crmDb';
import type { Customer } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PointClaimPayload = {
  couponCode?: string;
  shopId?: string;
  customer?: Partial<Customer>;
};

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message: 'ยังไม่ได้ตั้งค่า DATABASE_URL จึงไม่สามารถรับแต้มแบบออนไลน์เท่านั้นได้',
      },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as PointClaimPayload;
    const couponCode = String(body?.couponCode || '').trim().toUpperCase();
    const shopId = String(body?.shopId || '').trim();
    const customer = body?.customer || {};
    const customerId = String(customer?.id || '').trim();

    if (!couponCode || !shopId || !customerId) {
      return NextResponse.json(
        { ok: false, message: 'ข้อมูลรับแต้มไม่ครบ กรุณาลองใหม่อีกครั้ง' },
        { status: 400 },
      );
    }

    const result = await claimPointCouponOnline({ couponCode, shopId, customer: { ...customer, id: customerId } });

    return NextResponse.json({ ok: true, source: 'neon', ...result });
  } catch (error) {
    console.error('[crm-db:point-claim]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown point claim error' },
      { status: 500 },
    );
  }
}
