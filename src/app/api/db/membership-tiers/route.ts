import { NextRequest, NextResponse } from 'next/server';
import { insertAuditLogRow, isDatabaseConfigured, upsertMembershipTiersForShop } from '../../../../lib/server/crmDb';
import type { AuditLog, MembershipTier } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database is not configured. Online-only membership tiers require Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const shopId = String(body?.shopId || '').trim();
    const tiers = Array.isArray(body?.tiers) ? (body.tiers as MembershipTier[]) : [];
    const auditLog = body?.auditLog as AuditLog | undefined;

    if (!shopId || tiers.length === 0 || tiers.some((tier) => tier.shopId !== shopId)) {
      return NextResponse.json({ ok: false, message: 'Invalid membership tier payload.' }, { status: 400 });
    }

    await upsertMembershipTiersForShop(shopId, tiers);
    if (auditLog?.id) await insertAuditLogRow(auditLog);

    return NextResponse.json({ ok: true, source: 'neon', shopId, count: tiers.length });
  } catch (error) {
    console.error('[crm-db:membership-tiers]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown membership tier persistence error' },
      { status: 500 },
    );
  }
}
