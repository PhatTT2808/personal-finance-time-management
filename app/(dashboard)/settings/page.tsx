import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const createdAt = user?.created_at
    ? formatDate(user.created_at.slice(0, 10))
    : "-";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Cài đặt"
        description="Thông tin tài khoản của bạn."
      />

      <Card className="relative overflow-hidden border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-sky-300/45 before:to-transparent">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-base font-bold text-white">Tài khoản</CardTitle>
          <CardDescription className="text-slate-400">Thông tin đăng nhập hiện tại.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="shrink-0 text-sm font-semibold text-slate-400">Email</span>
            <span className="min-w-0 truncate text-right text-sm font-semibold text-slate-100">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="shrink-0 text-sm font-semibold text-slate-400">Ngày tạo</span>
            <span className="text-right text-sm font-semibold text-slate-100">{createdAt}</span>
          </div>
          <div className="pt-2">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
