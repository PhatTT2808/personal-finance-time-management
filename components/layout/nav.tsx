"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Clock,
  ListTodo,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { href: "/transactions", label: "Giao dịch", icon: ArrowLeftRight },
  { href: "/time-blocks", label: "Khối thời gian", icon: Clock },
  { href: "/todos", label: "Việc cần làm", icon: ListTodo },
  { href: "/settings", label: "Cài đặt", icon: Settings },
];

export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "border-sky-400/30 bg-gradient-to-r from-sky-500/18 via-white/[0.06] to-red-500/12 text-white shadow-[0_0_28px_rgba(14,165,233,0.14)]"
                : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100"
            )}
          >
            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-sky-300" : "text-slate-500 group-hover:text-sky-300")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
