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

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      source: 'local-fallback',
      message: 'DATABASE_URL is not configured. Using built-in local mock data fallback.',
      data: initialSnapshot,
    });
  }

  try {
    await ensureCrmSchema();
    const seeded = await seedInitialDataIfEmpty();
    const data = await getCrmSnapshot();

    return NextResponse.json({
      ok: true,
      source: 'neon',
      seeded,
      data,
    });
  } catch (error) {
    console.error('[crm-db:snapshot]', error);
    return NextResponse.json(
      {
        ok: false,
        source: 'error-fallback',
        message: error instanceof Error ? error.message : 'Unknown database error',
        data: initialSnapshot,
      },
      { status: 500 }
    );
  }
}
