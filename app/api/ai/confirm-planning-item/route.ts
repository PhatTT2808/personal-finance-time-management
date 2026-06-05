import { NextResponse } from "next/server";

import { normalizePlanningItems, isValidPlanningItem } from "@/lib/ai/planning-validation";
import type { PlanningPreviewItem } from "@/lib/ai/types";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { TimeBlock, Todo } from "@/types/database";

const MAX_ITEMS = 20;
const TODO_COLUMNS =
  "id, user_id, title, description, status, due_date, priority, created_at, updated_at";
const TIME_BLOCK_COLUMNS =
  "id, user_id, title, type, custom_type, start_time, end_time, block_date, note, created_at, updated_at";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { items?: unknown };
  const items = normalizePlanningItems(body.items, todayISO(), MAX_ITEMS);

  if (items.length === 0 || items.some((item) => !isValidPlanningItem(item))) {
    return NextResponse.json(
      { ok: false, error: "Một hoặc nhiều mục không hợp lệ." },
      { status: 400 }
    );
  }

  const saved: Array<Todo | TimeBlock> = [];
  const todos = items.filter((item): item is Extract<PlanningPreviewItem, { kind: "todo" }> => item.kind === "todo");
  const timeBlocks = items.filter((item): item is Extract<PlanningPreviewItem, { kind: "time_block" }> => item.kind === "time_block");

  if (todos.length > 0) {
    const rows = todos.map(({ kind: _kind, ...todo }) => ({ ...todo, user_id: user.id }));
    const { data, error } = await supabase.from("todos").insert(rows).select(TODO_COLUMNS);
    if (error) {
      return NextResponse.json(
        { ok: false, error: "Không thể lưu todo. Vui lòng thử lại." },
        { status: 500 }
      );
    }
    saved.push(...((data ?? []) as Todo[]));
  }

  if (timeBlocks.length > 0) {
    const rows = timeBlocks.map(({ kind: _kind, ...timeBlock }) => ({ ...timeBlock, user_id: user.id }));
    const { data, error } = await supabase.from("time_blocks").insert(rows).select(TIME_BLOCK_COLUMNS);
    if (error) {
      return NextResponse.json(
        { ok: false, error: "Không thể lưu lịch. Vui lòng thử lại." },
        { status: 500 }
      );
    }
    saved.push(...((data ?? []) as TimeBlock[]));
  }

  return NextResponse.json({ ok: true, saved });
}