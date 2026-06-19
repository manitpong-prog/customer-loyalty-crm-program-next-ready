import { NextRequest, NextResponse } from 'next/server';
import { insertAuditLogRow, isDatabaseConfigured, upsertCustomerRow } from '../../../../lib/server/crmDb';
import type { AuditLog, Customer } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validateCustomer(customer: Partial<Customer> | null | undefined): customer is Customer {
  return Boolean(
    customer &&
      typeof customer.id === 'string' && customer.id.trim() &&
      typeof customer.name === 'string' && customer.name.trim()
  );
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database is not configured. Online-only customer writes require Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body?.action || 'upsert';
    const customer = body?.customer as Customer | undefined;
    const auditLog = body?.auditLog as AuditLog | undefined;

    if (action !== 'upsert') {
      return NextResponse.json({ ok: false, message: 'Invalid customer action.' }, { status: 400 });
    }

    if (!validateCustomer(customer)) {
      return NextResponse.json({ ok: false, message: 'Invalid customer payload.' }, { status: 400 });
    }

    const confirmedCustomer = await upsertCustomerRow({
      ...customer,
      currentPoints: Math.max(0, Number(customer.currentPoints) || 0),
      lifetimePoints: Math.max(0, Number(customer.lifetimePoints) || 0),
      tier: customer.tier || 'Member',
      createdAt: customer.createdAt || new Date().toISOString(),
      shopIds: customer.shopIds || [],
    });

    if (auditLog?.id) await insertAuditLogRow(auditLog);

    return NextResponse.json({ ok: true, source: 'neon', action, customer: confirmedCustomer });
  } catch (error) {
    console.error('[crm-db:customers]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown customer persistence error' },
      { status: 500 },
    );
  }
}
