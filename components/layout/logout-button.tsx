"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-muted-foreground"
      onClick={handleLogout}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Đăng xuất
    </Button>
  );
}
