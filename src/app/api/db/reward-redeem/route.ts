import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, redeemRewardOnline } from '../../../../lib/server/crmDb';
import type { Customer, RewardPaymentMethod } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RewardRedeemPayload = {
  rewardId?: string;
  shopId?: string;
  customer?: Partial<Customer>;
  paymentMethod?: RewardPaymentMethod;
};

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'ยังไม่ได้ตั้งค่า DATABASE_URL จึงไม่สามารถแลกรางวัลแบบออนไลน์เท่านั้นได้' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as RewardRedeemPayload;
    const rewardId = String(body?.rewardId || '').trim();
    const shopId = String(body?.shopId || '').trim();
    const customer = body?.customer || {};
    const customerId = String(customer?.id || '').trim();

    if (!rewardId || !shopId || !customerId) {
      return NextResponse.json(
        { ok: false, message: 'ข้อมูลแลกรางวัลไม่ครบ กรุณาลองใหม่อีกครั้ง' },
        { status: 400 },
      );
    }

    const paymentMethod = body?.paymentMethod === 'tickets' ? 'tickets' : 'points';
    const result = await redeemRewardOnline({ rewardId, shopId, customer: { ...customer, id: customerId }, paymentMethod });
    return NextResponse.json({ ok: true, source: 'neon', ...result });
  } catch (error) {
    console.error('[crm-db:reward-redeem]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown reward redeem error' },
      { status: 500 },
    );
  }
}
