import { NextRequest, NextResponse } from 'next/server';
import { CrmEntity, isDatabaseConfigured, syncEntity } from '../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const allowedEntities = new Set<CrmEntity>(['shops', 'customers', 'rewards', 'banners', 'transactions', 'coupons', 'auditLogs']);

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, source: 'local-fallback' });
  }

  try {
    const body = await request.json();
    const entity = body?.entity as CrmEntity;
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (!allowedEntities.has(entity)) {
      return NextResponse.json({ ok: false, message: 'Invalid CRM entity.' }, { status: 400 });
    }

    await syncEntity(entity, rows);
    return NextResponse.json({ ok: true, source: 'neon', entity, count: rows.length });
  } catch (error) {
    console.error('[crm-db:sync]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown sync error' },
      { status: 500 }
    );
  }
}
