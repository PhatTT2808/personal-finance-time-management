import { NextResponse } from "next/server";

import { isPlanningScopedMessage } from "@/lib/ai/guards/planning-scope-guard";
import { createKimiJsonCompletion } from "@/lib/ai/model/kimi-client";
import { normalizePlanningItems } from "@/lib/ai/planning-validation";
import { buildPlanningItemParserPrompt } from "@/lib/ai/prompts/planning-item-parser";
import type { PlanningParseResult, PlanningPreviewItem } from "@/lib/ai/types";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { TimeBlockType, TodoPriority } from "@/types/database";

const MAX_MESSAGE_LENGTH = 1500;
const MAX_ITEMS = 20;
const BLOCKED_RESPONSE: PlanningParseResult = {
  ok: false,
  items: [],
  question: "Mình chỉ hỗ trợ tạo todo hoặc lịch trong ứng dụng này.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { ok: false, items: [], question: "Vui lòng nhập việc hoặc lịch bạn muốn tạo." },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { ok: false, items: [], question: "Nội dung quá dài. Bạn nhập ngắn gọn hơn nhé." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, items: [], question: "Bạn cần đăng nhập để sử dụng trợ lý AI." },
        { status: 401 }
      );
    }

    if (!isPlanningScopedMessage(message)) {
      return NextResponse.json(BLOCKED_RESPONSE);
    }

    const today = todayISO();
    const ruleBasedItems = normalizePlanningItems(parsePlanningItemsRuleBased(message, today), today, MAX_ITEMS);

    if (ruleBasedItems.length > 0) {
      console.log("planning_parser_selected", "rule_based");
      console.log("planning_ai_skipped", true);
      console.log("parsed_item_count", ruleBasedItems.length);
      return NextResponse.json({ ok: true, items: ruleBasedItems, question: null });
    }

    console.log("planning_parser_selected", "ai");
    console.log("planning_ai_skipped", false);
    console.log("parsed_item_count", 0);

    const content = await createKimiJsonCompletion([
      { role: "system", content: buildPlanningItemParserPrompt(today) },
      { role: "user", content: message },
    ]);
    const parsed = JSON.parse(content) as unknown;

    return NextResponse.json(normalizeParseResult(parsed, today));
  } catch (error) {
    console.error("AI planning item parse failed", error);
    if (isRateLimitError(error)) {
      return NextResponse.json(
        {
          ok: false,
          items: [],
          question: "AI đang bị giới hạn tạm thời. Bạn thử lại sau hoặc nhập câu ngắn hơn nhé.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        items: [],
        question: "Mình chưa phân tích được nội dung này. Bạn nói rõ hơn việc/lịch muốn tạo nhé.",
      },
      { status: 200 }
    );
  }
}

function parsePlanningItemsRuleBased(message: string, today: string): PlanningPreviewItem[] {
  const lower = message.toLowerCase();
  const hasTimeRange = /\d{1,2}(?:h\d{0,2}|:\d{2})\s*(?:-|đến|toi|tới)\s*\d{1,2}(?:h\d{0,2}|:\d{2})/u.test(lower);
  const hasFromTo = /(?:^|\s)từ\s+.+\s+(?:đến|toi|tới)(?:\s|$)/u.test(lower);
  const todoIntent = /(?:^|\s)(?:todo|nhắc|việc|deadline|hạn)(?:\s|$)/u.test(lower);
  const timeBlockIntent = /(?:^|\s)(?:lịch|khối thời gian)(?:\s|$)/u.test(lower) || hasFromTo || hasTimeRange;

  if (timeBlockIntent) {
    const range = parseTimeRange(lower);
    if (!range) return [];

    const type = detectTimeBlockType(lower);
    return [
      {
        kind: "time_block",
        title: cleanPlanningTitle(message, "time_block"),
        type,
        custom_type: type === "other" ? cleanPlanningTitle(message, "time_block") : null,
        block_date: parseVietnameseDate(lower, today),
        start_time: range.start,
        end_time: range.end,
        note: null,
      },
    ];
  }

  if (todoIntent) {
    return [
      {
        kind: "todo",
        title: cleanPlanningTitle(message, "todo"),
        description: null,
        due_date: parseVietnameseDate(lower, today),
        priority: detectPriority(lower),
        status: "pending",
      },
    ];
  }

  return [];
}

function parseVietnameseDate(lowerMessage: string, today: string) {
  if (/(?:^|\s)ngày mai(?:\s|$)/u.test(lowerMessage)) return addDays(today, 1);
  if (/(?:^|\s)(?:hôm nay|tối nay)(?:\s|$)/u.test(lowerMessage)) return today;

  const weekdayMatch = lowerMessage.match(/(?:^|\s)(thứ\s*[2-7]|chủ nhật|chu nhat)(?:\s|$)/u);
  if (!weekdayMatch) return today;

  const target = weekdayMatch[1].startsWith("thứ")
    ? Number(weekdayMatch[1].replace(/\D/gu, ""))
    : 8;
  return nextWeekday(today, target === 8 ? 0 : target - 1);
}

function parseTimeRange(lowerMessage: string) {
  const match = lowerMessage.match(/(\d{1,2}(?:h\d{0,2}|:\d{2}))\s*(?:-|đến|toi|tới)\s*(\d{1,2}(?:h\d{0,2}|:\d{2}))/u);
  if (!match) return null;

  const start = normalizeVietnameseTime(match[1]);
  const end = normalizeVietnameseTime(match[2]);
  if (!start || !end || toMinutes(end) <= toMinutes(start)) return null;
  return { start, end };
}

function normalizeVietnameseTime(value: string) {
  const match = value.match(/^(\d{1,2})(?:h(\d{0,2})|:(\d{2}))$/u);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || match[3] || "0");
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function detectPriority(lowerMessage: string): TodoPriority {
  if (/(?:^|\s)(?:ưu tiên cao|gấp|quan trọng)(?:\s|$)/u.test(lowerMessage)) return "high";
  if (/(?:^|\s)(?:thấp|không gấp)(?:\s|$)/u.test(lowerMessage)) return "low";
  return "medium";
}

function detectTimeBlockType(lowerMessage: string): TimeBlockType {
  if (/(?:^|\s)(?:học|sql|mlops|ai)(?:\s|$)/u.test(lowerMessage)) return "study";
  if (/(?:^|\s)(?:làm|project|code|công việc)(?:\s|$)/u.test(lowerMessage)) return "work";
  if (/(?:^|\s)(?:gym|tập)(?:\s|$)/u.test(lowerMessage)) return "gym";
  if (/(?:^|\s)(?:trường)(?:\s|$)/u.test(lowerMessage)) return "school";
  if (/(?:^|\s)(?:nghỉ|ngủ)(?:\s|$)/u.test(lowerMessage)) return "rest";
  return "other";
}

function cleanPlanningTitle(message: string, kind: "todo" | "time_block") {
  let title = message
    .replace(/\b(tạo|thêm|nhắc tôi|todo|việc|lịch|khối thời gian)\b/giu, " ")
    .replace(/\b(deadline|hạn|ưu tiên cao|ưu tiên thấp|gấp|quan trọng|không gấp)\b/giu, " ")
    .replace(/\b(hôm nay|ngày mai|tối nay|thứ\s*[2-7]|chủ nhật)\b/giu, " ")
    .replace(/\b(từ)\b.*$/iu, " ")
    .replace(/\d{1,2}(?:h\d{0,2}|:\d{2})\s*(?:-|đến|toi|tới)\s*\d{1,2}(?:h\d{0,2}|:\d{2})/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  if (!title) title = kind === "todo" ? "Việc mới" : "Lịch mới";
  return title;
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return formatISODate(date);
}

function nextWeekday(today: string, targetDay: number) {
  const date = new Date(`${today}T00:00:00+07:00`);
  const currentDay = date.getDay();
  const delta = (targetDay - currentDay + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return formatISODate(date);
}

function formatISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isRateLimitError(error: unknown) {
  if (!error) return false;
  if (typeof error === "string") return error.includes("429");
  if (error instanceof Error) return error.message.includes("429");
  if (!isRecord(error)) return false;
  return error.status === 429 || String(error.message ?? "").includes("429");
}

function normalizeParseResult(value: unknown, today: string): PlanningParseResult {
  if (!isRecord(value)) return invalidResult();

  if (value.ok === false) {
    return {
      ok: false,
      items: [],
      question: typeof value.question === "string" && value.question.trim()
        ? value.question.trim()
        : "Bạn muốn tạo todo hay lịch?",
    };
  }

  const items = normalizePlanningItems(value.items, today, MAX_ITEMS);
  if (items.length === 0) return invalidResult();

  return { ok: true, items, question: null };
}

function invalidResult(): PlanningParseResult {
  return {
    ok: false,
    items: [],
    question: "Mình chưa chắc nên tạo todo hay lịch. Bạn có thể nói rõ hơn không?",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}