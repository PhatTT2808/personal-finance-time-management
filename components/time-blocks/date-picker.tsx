"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TimeBlockDatePicker({
  date,
  onChange,
}: {
  date: string;
  onChange?: (date: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-2xl shadow-black/10 sm:w-fit">
      <Label htmlFor="filter-date" className="text-sm font-semibold text-slate-400">
        Ngày
      </Label>
      <Input
        id="filter-date"
        type="date"
        value={date}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-44"
      />
    </div>
  );
}
