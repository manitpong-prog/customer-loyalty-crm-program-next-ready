import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PlatformAdminDashboard from "../../components/PlatformAdminDashboard";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "../../lib/server/adminAuth";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const session = verifyAdminSessionToken(token);

  if (!session) {
    redirect("/admin/login?next=/admin");
  }

  return <PlatformAdminDashboard adminEmail={session.email} />;
}
