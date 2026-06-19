import { NextRequest, NextResponse } from 'next/server';
import { insertAuditLogRow, isDatabaseConfigured, upsertOnboardingChecklistRow } from '../../../../lib/server/crmDb';
import type { AuditLog, ShopOnboardingChecklist } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database is not configured. Online-only checklist requires Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const checklist = body?.checklist as ShopOnboardingChecklist | undefined;
    const auditLog = body?.auditLog as AuditLog | undefined;
    if (!checklist?.id || !checklist.shopId) {
      return NextResponse.json({ ok: false, message: 'Invalid checklist payload.' }, { status: 400 });
    }
    await upsertOnboardingChecklistRow(checklist);
    if (auditLog?.id) await insertAuditLogRow(auditLog);
    return NextResponse.json({ ok: true, source: 'neon', shopId: checklist.shopId });
  } catch (error) {
    console.error('[crm-db:onboarding-checklist]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown onboarding checklist error' },
      { status: 500 },
    );
  }
}
