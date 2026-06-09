import { NextRequest, NextResponse } from 'next/server';
import { clearCrmData, getCrmSnapshot, isDatabaseConfigured, reseedDemoData } from '../../../../lib/server/crmDb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (process.env.ALLOW_DB_RESET !== 'true') {
    return NextResponse.json(
      { ok: false, message: 'Database reset API is disabled. Set ALLOW_DB_RESET=true only when you intentionally want to reset test data.' },
      { status: 403 }
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'DATABASE_URL is not configured.' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === 'seed-demo' ? 'seed-demo' : 'clear';

    if (mode === 'seed-demo') {
      await reseedDemoData();
    } else {
      await clearCrmData();
    }

    const data = await getCrmSnapshot();
    return NextResponse.json({ ok: true, mode, data });
  } catch (error) {
    console.error('[crm-db:reset]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown reset error' },
      { status: 500 }
    );
  }
}
