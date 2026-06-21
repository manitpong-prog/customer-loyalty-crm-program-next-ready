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
    // Runtime schema checks are intentionally opt-in. Migrations already create
    // the production schema. Running schema DDL on every dashboard/customer load
    // caused slow reads on Vercel + Neon.
    const shouldBootstrap = false; // process.env.ENABLE_RUNTIME_SCHEMA_CHECK === 'true'; // Disabled to prevent DB bloat and slow reads
    const seedResult = shouldBootstrap
      ? (await ensureCrmSchema(), await seedInitialDataIfEmpty())
      : { seeded: false, mode: 'skipped-runtime-check' };
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
