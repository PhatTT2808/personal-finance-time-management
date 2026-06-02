"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TimeBlockDatePicker({ date }: { date: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="filter-date" className="text-sm text-muted-foreground">
        Ngày
      </Label>
      <Input
        id="filter-date"
        type="date"
        value={date}
        onChange={(e) => router.push(`/time-blocks?date=${e.target.value}`)}
        className="w-44"
      />
    </div>
  );
}
