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
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#070a10]/95 px-4 py-3 text-slate-100 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl border border-sky-400/25 bg-sky-400/10 shadow-[0_0_24px_rgba(56,189,248,0.16)]">
            <Wallet className="h-5 w-5 text-sky-300" />
          </span>
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
           "z-50 flex w-full flex-col border-b border-white/10 bg-[#070a10]/95 p-4 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r md:border-white/10",
          open ? "block" : "hidden md:flex"
        )}
      >
        <div className="mb-8 hidden items-center gap-3 px-2 text-lg font-semibold tracking-tight md:flex">
          <span className="grid size-10 place-items-center rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-400/20 to-red-500/10 shadow-[0_0_30px_rgba(56,189,248,0.18)]">
            <Wallet className="h-5 w-5 text-sky-300" />
          </span>
          <span>Quản lý cá nhân</span>
        </div>

        <Nav onNavigate={() => setOpen(false)} />

        <div className="mt-auto min-w-0 space-y-3 border-t border-white/10 pt-5">
          <p
            className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-400"
            title={email}
          >
            {email}
          </p>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
