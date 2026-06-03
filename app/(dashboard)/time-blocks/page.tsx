import { createClient } from "@/lib/supabase/server";
import {
  monthRange,
  todayISO,
} from "@/lib/format";
import type { TimeBlock } from "@/types/database";
import { TimeBlocksClient } from "@/components/time-blocks/time-blocks-client";

export default async function TimeBlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? todayISO();
  const [year, month] = date.split("-").map(Number);
  const { start, end } = monthRange(year, month);

  const supabase = await createClient();

  // Fetch the selected month so calendar indicators can be computed locally.
  const { data } = await supabase
    .from("time_blocks")
    .select("*")
    .gte("block_date", start)
    .lte("block_date", end)
    .order("start_time", { ascending: true });

  const weekBlocks = (data ?? []) as TimeBlock[];

  return (
    <TimeBlocksClient initialBlocks={weekBlocks} selectedDate={date} />
  );
}
