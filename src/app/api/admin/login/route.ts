import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminCookieOptions,
  getAdminEmail,
  isUsingDefaultAdminCredentials,
  verifyAdminCredentials,
} from "../../../../lib/server/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 },
      );
    }

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json(
        { ok: false, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const adminEmail = getAdminEmail();
    const token = createAdminSessionToken(adminEmail);
    const response = NextResponse.json({
      ok: true,
      admin: {
        email: adminEmail,
        usingDefaultCredentials: isUsingDefaultAdminCredentials(),
      },
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, token, getAdminCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Admin login failed",
      },
      { status: 500 },
    );
  }
}
