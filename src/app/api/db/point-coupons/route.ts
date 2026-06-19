import { NextRequest, NextResponse } from 'next/server';
import { deletePointCouponRow, insertAuditLogRow, isDatabaseConfigured, upsertPointCouponRow } from '../../../../lib/server/crmDb';
import type { GeneratedCoupon } from '../../../../lib/server/crmDb';
import type { AuditLog } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validateCoupon(coupon: Partial<GeneratedCoupon> | null | undefined): coupon is GeneratedCoupon {
  return Boolean(
    coupon &&
      typeof coupon.code === 'string' && coupon.code.trim() &&
      typeof coupon.shopId === 'string' && coupon.shopId.trim() &&
      Number(coupon.points) > 0 &&
      typeof coupon.expiresAt === 'string' && coupon.expiresAt.trim()
  );
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database is not configured. Online-only point coupons require Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body?.action;
    const auditLog = body?.auditLog as AuditLog | undefined;

    if (action === 'upsert') {
      const coupon = body?.coupon as GeneratedCoupon | undefined;
      if (!validateCoupon(coupon)) {
        return NextResponse.json({ ok: false, message: 'Invalid coupon payload.' }, { status: 400 });
      }
      await upsertPointCouponRow(coupon);
      if (auditLog?.id) await insertAuditLogRow(auditLog);
      return NextResponse.json({ ok: true, source: 'neon', action, code: coupon.code });
    }

    if (action === 'delete') {
      const code = String(body?.code || '').trim();
      const shopId = String(body?.shopId || '').trim();
      if (!code || !shopId) {
        return NextResponse.json({ ok: false, message: 'Missing code or shopId.' }, { status: 400 });
      }
      await deletePointCouponRow(code, shopId);
      if (auditLog?.id) await insertAuditLogRow(auditLog);
      return NextResponse.json({ ok: true, source: 'neon', action, code });
    }

    return NextResponse.json({ ok: false, message: 'Invalid point coupon action.' }, { status: 400 });
  } catch (error) {
    console.error('[crm-db:point-coupons]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown point coupon persistence error' },
      { status: 500 },
    );
  }
}
