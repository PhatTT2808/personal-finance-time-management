import { Plus, Clock, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  todayISO,
  weekRange,
  formatTime,
  hoursBetween,
  formatHours,
  formatDate,
} from "@/lib/format";
import type { TimeBlock } from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { TimeBlockDialog } from "@/components/time-blocks/time-block-dialog";
import { TimeBlockItem } from "@/components/time-blocks/time-block-item";
import { TimeBlockDatePicker } from "@/components/time-blocks/date-picker";

function totalHours(blocks: TimeBlock[]): number {
  return blocks.reduce(
    (sum, b) =>
      sum + hoursBetween(formatTime(b.start_time), formatTime(b.end_time)),
    0
  );
}

export default async function TimeBlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? todayISO();
  const { start, end } = weekRange(date);

  const supabase = await createClient();

  // Fetch all blocks for the week containing the selected date in one query.
  const { data } = await supabase
    .from("time_blocks")
    .select("*")
    .gte("block_date", start)
    .lte("block_date", end)
    .order("start_time", { ascending: true });

  const weekBlocks = (data ?? []) as TimeBlock[];
  const dayBlocks = weekBlocks.filter((b) => b.block_date === date);

  const dayTotal = totalHours(dayBlocks);
  const weekTotal = totalHours(weekBlocks);

  return (
    <div>
      <PageHeader
        title="Khối thời gian"
        description="Lập kế hoạch và theo dõi thời gian của bạn."
        action={
          <TimeBlockDialog
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
        />
        <StatCard
          label="Tổng giờ trong tuần"
          value={`${formatHours(weekTotal)} giờ`}
          icon={<CalendarDays className="h-5 w-5" />}
        />
      </div>

      <div className="mb-4">
        <TimeBlockDatePicker date={date} />
      </div>

      <p className="mb-2 text-sm font-semibold text-muted-foreground">
        Lịch ngày {formatDate(date)}
      </p>

      {dayBlocks.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Chưa có khối thời gian nào trong ngày này.
        </div>
      ) : (
        <div className="space-y-2">
          {dayBlocks.map((b) => (
            <TimeBlockItem key={b.id} block={b} />
          ))}
        </div>
      )}
    </div>
  );
}
