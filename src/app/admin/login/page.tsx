import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLoginForm from "../../../components/AdminLoginForm";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../../lib/server/adminAuth";

interface AdminLoginPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

function sanitizeNextPath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/admin";
  if (path.startsWith("/admin/login")) return "/admin";
  return path;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next);
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const session = verifyAdminSessionToken(token);

  if (session) {
    redirect(nextPath);
  }

  return <AdminLoginForm nextPath={nextPath} />;
}
