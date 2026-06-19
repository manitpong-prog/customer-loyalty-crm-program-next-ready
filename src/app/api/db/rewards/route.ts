import { NextRequest, NextResponse } from 'next/server';
import { deleteRewardRow, isDatabaseConfigured, upsertRewardRow } from '../../../../lib/server/crmDb';
import type { Reward } from '../../../../types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function validateReward(reward: Partial<Reward> | null | undefined): reward is Reward {
  return Boolean(
    reward &&
    typeof reward.id === 'string' && reward.id.trim() &&
    typeof reward.name === 'string' && reward.name.trim() &&
    typeof reward.shopId === 'string' && reward.shopId.trim()
  );
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: true, source: 'local-fallback' });
  }

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'upsert') {
      const reward = body?.reward as Reward | undefined;
      if (!validateReward(reward)) {
        return NextResponse.json({ ok: false, message: 'Invalid reward payload.' }, { status: 400 });
      }

      await upsertRewardRow(reward);
      return NextResponse.json({ ok: true, source: 'neon', action, rewardId: reward.id });
    }

    if (action === 'delete') {
      const rewardId = String(body?.rewardId || '').trim();
      const shopId = String(body?.shopId || '').trim();

      if (!rewardId || !shopId) {
        return NextResponse.json({ ok: false, message: 'Missing rewardId or shopId.' }, { status: 400 });
      }

      await deleteRewardRow(rewardId, shopId);
      return NextResponse.json({ ok: true, source: 'neon', action, rewardId });
    }

    return NextResponse.json({ ok: false, message: 'Invalid reward action.' }, { status: 400 });
  } catch (error) {
    console.error('[crm-db:rewards]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown reward persistence error' },
      { status: 500 },
    );
  }
}
