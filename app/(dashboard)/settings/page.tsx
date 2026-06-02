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

      <Card>
        <CardHeader>
          <CardTitle>Tài khoản</CardTitle>
          <CardDescription>Thông tin đăng nhập hiện tại.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-3">
            <span className="text-sm text-muted-foreground">Ngày tạo</span>
            <span className="text-sm font-medium">{createdAt}</span>
          </div>
          <div className="pt-2">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
