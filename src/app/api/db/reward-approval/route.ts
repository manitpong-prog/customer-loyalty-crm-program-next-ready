import { NextRequest, NextResponse } from 'next/server';
import { handleRewardApprovalOnline, isDatabaseConfigured } from '../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RewardApprovalPayload = {
  transactionId?: string;
  shopId?: string;
  action?: 'approve' | 'reject';
};

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'ยังไม่ได้ตั้งค่า DATABASE_URL จึงไม่สามารถอนุมัติรางวัลแบบออนไลน์เท่านั้นได้' },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as RewardApprovalPayload;
    const transactionId = String(body?.transactionId || '').trim();
    const shopId = String(body?.shopId || '').trim();
    const action = body?.action;

    if (!transactionId || !shopId || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { ok: false, message: 'ข้อมูลอนุมัติรางวัลไม่ครบ กรุณาลองใหม่อีกครั้ง' },
        { status: 400 },
      );
    }

    const result = await handleRewardApprovalOnline({ transactionId, shopId, action });
    return NextResponse.json({ ok: true, source: 'neon', ...result });
  } catch (error) {
    console.error('[crm-db:reward-approval]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown reward approval error' },
      { status: 500 },
    );
  }
}
