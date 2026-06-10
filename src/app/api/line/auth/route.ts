import { NextRequest, NextResponse } from "next/server";
import {
  ensureCrmSchema,
  ensureCustomerMembershipForLineUser,
  getOwnerShopIds,
  upsertLineUser,
} from "../../../../lib/server/crmDb";

type LineProfilePayload = {
  userId?: string;
  displayName?: string;
  pictureUrl?: string;
};

type VerifyLineTokenResponse = {
  sub?: string;
  name?: string;
  picture?: string;
  email?: string;
  error?: string;
  error_description?: string;
};

async function verifyLineIdToken(idToken: string) {
  const channelId = process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || "";

  if (!channelId) {
    return null;
  }

  const body = new URLSearchParams();
  body.set("id_token", idToken);
  body.set("client_id", channelId);

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json()) as VerifyLineTokenResponse;

  if (!response.ok || !payload.sub) {
    throw new Error(payload.error_description || payload.error || "LINE ID token verify failed");
  }

  return {
    lineUserId: payload.sub,
    displayName: payload.name || "LINE User",
    pictureUrl: payload.picture || "",
    email: payload.email || "",
    verified: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const context = body?.context === "merchant" ? "merchant" : "customer";
    const shopId = typeof body?.shopId === "string" ? body.shopId : "";
    const idToken = typeof body?.idToken === "string" ? body.idToken : "";
    const profile = (body?.profile || {}) as LineProfilePayload;

    if (!shopId) {
      return NextResponse.json(
        { ok: false, message: "shopId is required" },
        { status: 400 },
      );
    }

    await ensureCrmSchema();

    let verifiedProfile = idToken ? await verifyLineIdToken(idToken) : null;
    let verified = Boolean(verifiedProfile?.verified);
    let source: "line-id-token" | "line-profile-fallback" = "line-id-token";

    if (!verifiedProfile) {
      if (!profile.userId) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "ไม่พบ LINE profile และยังไม่ได้ตั้ง LINE_CHANNEL_ID สำหรับ verify ID token",
          },
          { status: 400 },
        );
      }

      verifiedProfile = {
        lineUserId: profile.userId,
        displayName: profile.displayName || "LINE User",
        pictureUrl: profile.pictureUrl || "",
        email: "",
        verified: false,
      };
      verified = false;
      source = "line-profile-fallback";
    }

    await upsertLineUser({
      lineUserId: verifiedProfile.lineUserId,
      displayName: verifiedProfile.displayName,
      pictureUrl: verifiedProfile.pictureUrl,
      email: verifiedProfile.email,
    });

    let customerId: string | undefined;

    if (context === "customer") {
      const customer = await ensureCustomerMembershipForLineUser({
        shopId,
        lineUserId: verifiedProfile.lineUserId,
        displayName: verifiedProfile.displayName,
        pictureUrl: verifiedProfile.pictureUrl,
      });
      customerId = customer.id;
    }

    const ownerShopIds = await getOwnerShopIds(verifiedProfile.lineUserId);

    return NextResponse.json({
      ok: true,
      identity: {
        lineUserId: verifiedProfile.lineUserId,
        displayName: verifiedProfile.displayName,
        pictureUrl: verifiedProfile.pictureUrl,
        customerId,
        ownerShopIds,
        verified,
        source,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "LINE auth failed",
      },
      { status: 500 },
    );
  }
}
