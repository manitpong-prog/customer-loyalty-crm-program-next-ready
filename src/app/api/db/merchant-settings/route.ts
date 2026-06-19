import { NextRequest, NextResponse } from 'next/server';
import { insertAuditLogRow, isDatabaseConfigured, upsertShopRow } from '../../../../lib/server/crmDb';
import type { AuditLog, Shop } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validateShop(shop: Partial<Shop> | null | undefined): shop is Shop {
  return Boolean(
    shop &&
      typeof shop.id === 'string' && shop.id.trim() &&
      typeof shop.name === 'string' && shop.name.trim()
  );
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database is not configured. Online-only settings require Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const shop = body?.shop as Shop | undefined;
    const auditLog = body?.auditLog as AuditLog | undefined;

    if (!validateShop(shop)) {
      return NextResponse.json({ ok: false, message: 'Invalid shop payload.' }, { status: 400 });
    }

    await upsertShopRow(shop);
    if (auditLog?.id) await insertAuditLogRow(auditLog);

    return NextResponse.json({ ok: true, source: 'neon', shopId: shop.id });
  } catch (error) {
    console.error('[crm-db:merchant-settings]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown merchant settings error' },
      { status: 500 },
    );
  }
}
