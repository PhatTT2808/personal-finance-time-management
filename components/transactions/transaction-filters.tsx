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
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((label, i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(v) => updateParam("year", v as string)}
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years
            .sort((a, b) => b - a)
            .map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={type}
        onValueChange={(v) => updateParam("type", v as string)}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="income">Thu nhập</SelectItem>
          <SelectItem value="expense">Chi tiêu</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
