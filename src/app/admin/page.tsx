import { redirect } from "next/navigation";
import AdminDashboard from "@/app/admin/AdminDashboard";
import { getServerAuthProfile } from "@/lib/server-auth";

export default async function AdminPage() {
  const authProfile = await getServerAuthProfile();

  if (!authProfile) {
    redirect("/login");
  }

  if (authProfile.role !== "admin") {
    redirect("/");
  }

  return <AdminDashboard />;
}
