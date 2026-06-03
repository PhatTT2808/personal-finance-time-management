import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AIChatWidget } from "@/components/ai/ai-chat-widget";
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
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-slate-100 md:pl-64">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(37,99,235,0.24),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(239,68,68,0.16),transparent_24%),linear-gradient(135deg,#05070b_0%,#0a0f18_52%,#06070a_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
      <Sidebar email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-7xl p-4 md:p-8 lg:p-10">{children}</main>
      <AIChatWidget />
    </div>
  );
}
