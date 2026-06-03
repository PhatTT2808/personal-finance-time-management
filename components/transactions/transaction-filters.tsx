"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

type Props = {
  year: number;
  month: number; // 1-12
  type: string; // "all" | "income" | "expense"
};

export function TransactionFilters({ year, month, type }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const triggerClassName =
    "border-white/10 bg-slate-950/45 text-slate-200 shadow-lg shadow-black/10 ring-1 ring-white/5 backdrop-blur hover:border-sky-300/25 hover:bg-white/[0.04] focus-visible:border-sky-300/40 focus-visible:ring-sky-300/20";
  const contentClassName =
    "border border-white/10 bg-slate-950/95 text-slate-200 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur";
  const itemClassName =
    "text-slate-300 focus:bg-sky-400/10 focus:text-sky-100 data-highlighted:bg-sky-400/10 data-highlighted:text-sky-100";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/transactions?${params.toString()}`);
  }

  // Build a small list of recent years for the selector.
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];
  if (!years.includes(year)) years.push(year);

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={String(month)}
        onValueChange={(v) => updateParam("month", v as string)}
      >
        <SelectTrigger className={`w-32 ${triggerClassName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {MONTHS.map((label, i) => (
            <SelectItem key={i} value={String(i + 1)} className={itemClassName}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(v) => updateParam("year", v as string)}
      >
        <SelectTrigger className={`w-28 ${triggerClassName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {years
            .sort((a, b) => b - a)
            .map((y) => (
              <SelectItem key={y} value={String(y)} className={itemClassName}>
                {y}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={type}
        onValueChange={(v) => updateParam("type", v as string)}
      >
        <SelectTrigger className={`w-36 ${triggerClassName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          <SelectItem value="all" className={itemClassName}>Tất cả</SelectItem>
          <SelectItem value="income" className={itemClassName}>Thu nhập</SelectItem>
          <SelectItem value="expense" className={itemClassName}>Chi tiêu</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
