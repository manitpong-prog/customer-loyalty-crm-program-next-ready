import { NextRequest, NextResponse } from "next/server";
import {
  ensureCrmSchema,
  getLineUser,
  getOwnerShopIds,
  linkMerchantOwner,
} from "../../../../lib/server/crmDb";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shopId = typeof body?.shopId === "string" ? body.shopId : "";
    const lineUserId = typeof body?.lineUserId === "string" ? body.lineUserId : "";
    const linkCode = typeof body?.linkCode === "string" ? body.linkCode : "";
    const expectedCode = process.env.MERCHANT_OWNER_LINK_CODE || "";

    if (!expectedCode) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "ยังไม่ได้ตั้ง MERCHANT_OWNER_LINK_CODE ใน Environment Variables จึงยังผูกเจ้าของร้านผ่านหน้าเว็บไม่ได้",
        },
        { status: 400 },
      );
    }

    if (!shopId || !lineUserId || !linkCode) {
      return NextResponse.json(
        { ok: false, message: "shopId, lineUserId และ linkCode จำเป็นต้องมีครบ" },
        { status: 400 },
      );
    }

    if (linkCode !== expectedCode) {
      return NextResponse.json(
        { ok: false, message: "รหัสผูกเจ้าของร้านไม่ถูกต้อง" },
        { status: 403 },
      );
    }

    if (process.env.ENABLE_RUNTIME_SCHEMA_CHECK === 'true') {
      await ensureCrmSchema();
    }

    const lineUser = await getLineUser(lineUserId);
    if (!lineUser) {
      return NextResponse.json(
        { ok: false, message: "กรุณา Login with LINE ก่อนผูกเจ้าของร้าน" },
        { status: 404 },
      );
    }

    await linkMerchantOwner(shopId, lineUserId);
    const ownerShopIds = await getOwnerShopIds(lineUserId);

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
        message: error instanceof Error ? error.message : "Link merchant owner failed",
      },
      { status: 500 },
    );
  }
}
