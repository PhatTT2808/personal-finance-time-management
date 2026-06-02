import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this, but double-check on the server.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 md:pl-64">
      <Sidebar email={user.email ?? ""} />
      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
