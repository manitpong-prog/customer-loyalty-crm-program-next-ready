import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomerOnlineState,
  initialSnapshot,
  isDatabaseConfigured,
} from '../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shopId = String(searchParams.get('shopId') || '').trim();
  const customerId = String(searchParams.get('customerId') || '').trim();
  const lineUserId = String(searchParams.get('lineUserId') || '').trim();
  const couponCode = String(searchParams.get('couponCode') || '').trim();

  if (!isDatabaseConfigured()) {
    return jsonNoStore({
      ok: true,
      source: 'local-fallback',
      message: 'DATABASE_URL is not configured. Using local fallback customer snapshot.',
      data: initialSnapshot,
      servedAt: new Date().toISOString(),
    });
  }

  if (!shopId) {
    return jsonNoStore({ ok: false, message: 'Missing shopId.' }, { status: 400 });
  }

  try {
    const data = await getCustomerOnlineState({ shopId, customerId, lineUserId, couponCode });
    return jsonNoStore({ ok: true, source: 'neon', data, servedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[crm-db:customer-state]', error);
    return jsonNoStore(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown customer state error' },
      { status: 500 },
    );
  }
}
