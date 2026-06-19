import { NextRequest, NextResponse } from 'next/server';
import { deleteBannerRow, insertAuditLogRow, isDatabaseConfigured, upsertBannerRow } from '../../../../lib/server/crmDb';
import type { AuditLog, PromoBanner } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validateBanner(banner: Partial<PromoBanner> | null | undefined): banner is PromoBanner {
  return Boolean(
    banner &&
      typeof banner.id === 'string' && banner.id.trim() &&
      typeof banner.title === 'string' && banner.title.trim() &&
      typeof banner.shopId === 'string' && banner.shopId.trim()
  );
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Database is not configured. Online-only banners require Neon.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body?.action;
    const auditLog = body?.auditLog as AuditLog | undefined;

    if (action === 'upsert') {
      const banner = body?.banner as PromoBanner | undefined;
      if (!validateBanner(banner)) {
        return NextResponse.json({ ok: false, message: 'Invalid banner payload.' }, { status: 400 });
      }
      await upsertBannerRow(banner);
      if (auditLog?.id) await insertAuditLogRow(auditLog);
      return NextResponse.json({ ok: true, source: 'neon', action, bannerId: banner.id });
    }

    if (action === 'delete') {
      const bannerId = String(body?.bannerId || '').trim();
      const shopId = String(body?.shopId || '').trim();
      if (!bannerId || !shopId) {
        return NextResponse.json({ ok: false, message: 'Missing bannerId or shopId.' }, { status: 400 });
      }
      await deleteBannerRow(bannerId, shopId);
      if (auditLog?.id) await insertAuditLogRow(auditLog);
      return NextResponse.json({ ok: true, source: 'neon', action, bannerId });
    }

    return NextResponse.json({ ok: false, message: 'Invalid banner action.' }, { status: 400 });
  } catch (error) {
    console.error('[crm-db:banners]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown banner persistence error' },
      { status: 500 },
    );
  }
}
