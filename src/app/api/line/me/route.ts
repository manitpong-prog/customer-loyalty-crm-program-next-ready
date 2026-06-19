import { NextRequest, NextResponse } from "next/server";
import { ensureCrmSchema, getLineUser, getOwnerShopIds } from "../../../../lib/server/crmDb";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const lineUserId = request.nextUrl.searchParams.get("lineUserId") || "";

    if (!lineUserId) {
      return NextResponse.json(
        { ok: false, message: "lineUserId is required" },
        { status: 400 },
      );
    }

    if (process.env.ENABLE_RUNTIME_SCHEMA_CHECK === 'true') {
      await ensureCrmSchema();
    }

    const lineUser = await getLineUser(lineUserId);
    const ownerShopIds = await getOwnerShopIds(lineUserId);

    if (!lineUser) {
      return NextResponse.json(
        { ok: false, message: "ยังไม่พบ LINE user นี้ในระบบ" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      identity: {
        lineUserId: lineUser.lineUserId,
        displayName: lineUser.displayName,
        pictureUrl: lineUser.pictureUrl,
        customerId: `line_${lineUser.lineUserId}`,
        ownerShopIds,
        verified: false,
        source: "stored",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Load LINE user failed",
      },
      { status: 500 },
    );
  }
}
