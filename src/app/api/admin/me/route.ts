import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isUsingDefaultAdminCredentials,
  verifyAdminSessionToken,
} from "../../../../lib/server/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  const session = verifyAdminSessionToken(token);

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "ยังไม่ได้เข้าสู่ระบบผู้ดูแล" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    admin: {
      email: session.email,
      expiresAt: session.expiresAt,
      usingDefaultCredentials: isUsingDefaultAdminCredentials(),
    },
  });
}
