import { NextRequest, NextResponse } from 'next/server';
import { deleteTransactionRow, insertAuditLogRow, isDatabaseConfigured } from '../../../../lib/server/crmDb';
import type { AuditLog } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database is not configured. Online-only transaction writes require Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body?.action;
    const auditLog = body?.auditLog as AuditLog | undefined;

    if (action === 'delete') {
      const transactionId = String(body?.transactionId || '').trim();
      const shopId = String(body?.shopId || '').trim();

      if (!transactionId || !shopId) {
        return NextResponse.json({ ok: false, message: 'Missing transactionId or shopId.' }, { status: 400 });
      }

      await deleteTransactionRow(transactionId, shopId);
      if (auditLog?.id) await insertAuditLogRow(auditLog);
      return NextResponse.json({ ok: true, source: 'neon', action, transactionId });
    }

    return NextResponse.json({ ok: false, message: 'Invalid transaction action.' }, { status: 400 });
  } catch (error) {
    console.error('[crm-db:transactions]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown transaction persistence error' },
      { status: 500 },
    );
  }
}
