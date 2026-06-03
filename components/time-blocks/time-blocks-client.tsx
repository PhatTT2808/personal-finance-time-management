"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, Plus } from "lucide-react";
import type { TimeBlock } from "@/types/database";
import {
  formatDate,
  formatHours,
  formatTime,
  hoursBetween,
  todayISO,
  weekRange,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TimeBlockDatePicker } from "@/components/time-blocks/date-picker";
import { TimeBlockDialog } from "@/components/time-blocks/time-block-dialog";
import { TimeBlockItem } from "@/components/time-blocks/time-block-item";

type Props = {
  initialBlocks: TimeBlock[];
  selectedDate: string;
};

function totalHours(blocks: TimeBlock[]): number {
  return blocks.reduce(
    (sum, block) =>
      sum + hoursBetween(formatTime(block.start_time), formatTime(block.end_time)),
    0
  );
}

function sortBlocks(rows: TimeBlock[]) {
  return [...rows].sort((a, b) => {
    const dateCompare = a.block_date.localeCompare(b.block_date);
    if (dateCompare !== 0) return dateCompare;
    return a.start_time.localeCompare(b.start_time);
  });
}

function toISO(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parseISODate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function buildMonthDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export function TimeBlocksClient({ initialBlocks, selectedDate }: Props) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const initialMonth = parseISODate(selectedDate);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
  );

  function upsertBlock(block: TimeBlock) {
    setBlocks((current) => sortBlocks([
      ...current.filter((item) => item.id !== block.id),
      block,
    ]));
  }

  function deleteBlock(id: string) {
    setBlocks((current) => current.filter((item) => item.id !== id));
  }

  const scheduledDates = useMemo(
    () => new Set(blocks.map((block) => block.block_date)),
    [blocks]
  );
  const monthDays = useMemo(
    () => buildMonthDays(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  );
  const today = todayISO();
  const { start: weekStart, end: weekEnd } = weekRange(currentDate);
  const dayBlocks = blocks.filter((block) => block.block_date === currentDate);
  const dayTotal = totalHours(dayBlocks);
  const weekTotal = totalHours(
    blocks.filter(
      (block) => block.block_date >= weekStart && block.block_date <= weekEnd
    )
  );

  function changeMonth(offset: number) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  function selectDate(date: string) {
    setCurrentDate(date);
    const parsed = parseISODate(date);
    setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }

  return (
    <div>
      <PageHeader
        title="Khối thời gian"
        description="Lập kế hoạch và theo dõi thời gian của bạn."
        action={
          <TimeBlockDialog
            onSaved={upsertBlock}
            initialDate={currentDate}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm khối thời gian
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Tổng giờ trong ngày"
          value={`${formatHours(dayTotal)} giờ`}
          icon={<Clock className="h-5 w-5" />}
          valueClassName="text-sky-300"
        />
        <StatCard
          label="Tổng giờ trong tuần"
          value={`${formatHours(weekTotal)} giờ`}
          icon={<CalendarDays className="h-5 w-5" />}
          valueClassName="text-sky-300"
        />
      </div>

      <div className="mb-4">
        <TimeBlockDatePicker date={currentDate} onChange={selectDate} />
      </div>

      <Card className="relative mb-6 overflow-hidden border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-sky-300/45 before:to-transparent">
        <CardHeader className="gap-3 border-b border-white/10 sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold text-white">Lịch tháng</CardTitle>
            <p className="mt-1 text-sm text-slate-400">
              Tháng {visibleMonth.getMonth() + 1}, {visibleMonth.getFullYear()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-white/10 bg-black/20 text-slate-200 hover:border-sky-300/30 hover:bg-sky-400/10 hover:text-sky-100" onClick={() => changeMonth(-1)}>
              Tháng trước
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 bg-black/20 text-slate-200 hover:border-sky-300/30 hover:bg-sky-400/10 hover:text-sky-100" onClick={() => changeMonth(1)}>
              Tháng sau
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((date) => {
              const dateISO = toISO(date);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isToday = dateISO === today;
              const isSelected = dateISO === currentDate;
              const hasBlocks = scheduledDates.has(dateISO);

              return (
                <button
                  key={dateISO}
                  type="button"
                  onClick={() => selectDate(dateISO)}
                  className={cn(
                    "relative min-h-12 rounded-xl border border-white/10 bg-black/20 p-2 text-sm font-semibold text-slate-200 transition hover:border-sky-300/30 hover:bg-sky-400/10 hover:text-sky-100",
                    !isCurrentMonth && "bg-black/10 text-slate-600 hover:text-slate-400",
                    isToday && "border-sky-300/40 shadow-[0_0_18px_rgba(56,189,248,0.12)]",
                    hasBlocks && "border-red-300/20 bg-red-400/10",
                    isSelected && "border-sky-300/70 bg-sky-400/20 text-white shadow-[0_0_28px_rgba(56,189,248,0.22)] hover:bg-sky-400/25",
                  )}
                  aria-label={`Chọn ngày ${formatDate(dateISO)}`}
                >
                  {date.getDate()}
                  {hasBlocks && (
                    <span
                      className={cn(
                        "absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-300 shadow-[0_0_10px_rgba(248,113,113,0.65)]",
                        isSelected && "bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)]"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="mb-2 text-sm font-semibold text-slate-400">
        Lịch ngày {formatDate(currentDate)}
      </p>

      {dayBlocks.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-8 text-center text-sm text-slate-400 shadow-2xl shadow-black/20">
          Chưa có khối thời gian nào trong ngày này.
        </div>
      ) : (
        <div className="space-y-2">
          {dayBlocks.map((block) => (
            <TimeBlockItem
              key={block.id}
              block={block}
              onSaved={upsertBlock}
              onDeleted={deleteBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
}