import { NextResponse } from 'next/server';
import { ensureCrmSchema, getCrmSnapshot, isDatabaseConfigured } from '../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, source: 'local-fallback', message: 'DATABASE_URL is not configured.' }, { status: 200 });
  }

  try {
    await ensureCrmSchema();
    const snapshot = await getCrmSnapshot();

    return NextResponse.json({
      ok: true,
      source: 'neon',
      counts: {
        shops: snapshot.shops.length,
        customers: snapshot.customers.length,
        rewards: snapshot.rewards.length,
        banners: snapshot.banners.length,
        transactions: snapshot.transactions.length,
        coupons: snapshot.coupons.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, source: 'neon-error', message: error instanceof Error ? error.message : 'Unknown database health error' },
      { status: 500 }
    );
  }
}
