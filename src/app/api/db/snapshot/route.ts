import { NextResponse } from 'next/server';
import {
  ensureCrmSchema,
  getCrmSnapshot,
  initialSnapshot,
  isDatabaseConfigured,
  seedInitialDataIfEmpty,
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

export async function GET() {
  if (!isDatabaseConfigured()) {
    return jsonNoStore({
      ok: true,
      source: 'local-fallback',
      message: 'DATABASE_URL is not configured. Using built-in local mock data fallback.',
      data: initialSnapshot,
      servedAt: new Date().toISOString(),
    });
  }

  try {
    await ensureCrmSchema();
    const seedResult = await seedInitialDataIfEmpty();
    const data = await getCrmSnapshot();

    return jsonNoStore({
      ok: true,
      source: 'neon',
      seeded: seedResult.seeded,
      seedMode: seedResult.mode,
      data,
      servedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[crm-db:snapshot]', error);
    return jsonNoStore(
      {
        ok: false,
        source: 'error-fallback',
        message: error instanceof Error ? error.message : 'Unknown database error',
        data: initialSnapshot,
        servedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
