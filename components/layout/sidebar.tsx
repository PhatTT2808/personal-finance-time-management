"use client";

import { useState } from "react";
import { Menu, X, Wallet } from "lucide-react";
import { Nav } from "@/components/layout/nav";
import { LogoutButton } from "@/components/layout/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <Wallet className="h-5 w-5 text-primary" />
          Quản lý cá nhân
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label="Mở menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "flex w-full flex-col border-b bg-background p-4 md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r",
          open ? "block" : "hidden md:flex"
        )}
      >
        <div className="mb-6 hidden items-center gap-2 px-2 text-lg font-semibold md:flex">
          <Wallet className="h-6 w-6 text-primary" />
          Quản lý cá nhân
        </div>

        <Nav onNavigate={() => setOpen(false)} />

        <div className="mt-auto space-y-2 pt-6">
          <p className="truncate px-3 text-xs text-muted-foreground">{email}</p>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
