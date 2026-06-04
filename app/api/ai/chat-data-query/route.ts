import { NextResponse } from "next/server";

import { TIME_BLOCK_TYPE_LABELS } from "@/lib/constants";
import {
  formatTime,
  hoursBetween,
  monthRange,
  todayISO,
  weekRange,
} from "@/lib/format";
import { createKimiJsonCompletion } from "@/lib/ai/model/kimi-client";
import { createClient } from "@/lib/supabase/server";
import type { TimeBlockType, TodoPriority, TransactionType } from "@/types/database";

const MAX_MESSAGE_LENGTH = 1000;
const CHAT_AI_TIMEOUT_MS = 15_000;
const BLOCKED_REPLY =
  "Mình chỉ hỗ trợ các câu hỏi liên quan đến thu chi, todo, lịch và quản lý thời gian trong ứng dụng này.";
const AUTH_REPLY = "Bạn cần đăng nhập để sử dụng trợ lý AI.";
const ERROR_REPLY = "Mình chưa trả lời được lúc này. Bạn thử lại sau nhé.";
const AI_TIMEOUT_REPLY =
  "AI phản hồi quá lâu. Mình vẫn có thể trả lời nhanh các câu hỏi như lịch hôm nay, todo quá hạn, tổng chi tháng này.";

type DataQueryIntent =
  | "today_schedule"
  | "overdue_todos"
  | "today_todos"
  | "week_time_summary"
  | "month_spending_top_category"
  | "month_income_total"
  | "month_balance"
  | "complex_analysis";

type MonthTransaction = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string | null;
  transaction_date: string;
  created_at: string;
};

type DashboardTodo = {
  id: string;
  title: string;
  due_date: string | null;
  priority: TodoPriority;
  created_at: string;
};

type TimeBlockRow = {
  title: string;
  type: TimeBlockType;
  custom_type: string | null;
  start_time: string;
  end_time: string;
  block_date: string;
  note: string | null;
};

type FormattedTodo = ReturnType<typeof formatTodo>;
type FormattedTimeBlock = ReturnType<typeof formatTimeBlock>;
type UserDataSummary = {
  dates: { today: string; month_start: string; month_end: string; week_start: string; week_end: string };
  current_month_finance: {
    total_income: number;
    total_expense: number;
    balance: number;
    top_expense_categories: Array<{ category: string; amount: number }>;
    transaction_count: number;
  };
  latest_transactions: Array<{
    type: TransactionType;
    amount: number;
    category: string;
    note: string | null;
    date: string;
  }>;
  todos: {
    pending_count: number;
    pending: FormattedTodo[];
    overdue_count: number;
    overdue: FormattedTodo[];
    today_count: number;
    today: FormattedTodo[];
  };
  time_blocks: {
    today: FormattedTimeBlock[];
    this_week_hours_by_type: Array<{ type: string; hours: number }>;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ ok: false, reply: "Vui lòng nhập câu hỏi." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { ok: false, reply: "Câu hỏi quá dài. Bạn nhập ngắn gọn hơn nhé." },
        { status: 400 }
      );
    }

    if (!isDataQueryScopedMessage(message)) {
      return NextResponse.json({ ok: false, reply: BLOCKED_REPLY });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, reply: AUTH_REPLY }, { status: 401 });
    }

    const summary = await fetchUserDataSummary(supabase);
    const intent = detectIntent(message);
    logChatDataQuery("intent selected", { intent });

    const deterministicReply = buildDeterministicReply(intent, message, summary);
    if (deterministicReply) {
      logChatDataQuery("answer source", { source: "deterministic", intent });
      return NextResponse.json({ ok: true, reply: deterministicReply });
    }

    logChatDataQuery("answer source", { source: "ai", intent });
    const reply = await createKimiJsonCompletion([
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: JSON.stringify({ question: message, user_data_summary: summary }),
      },
    ], CHAT_AI_TIMEOUT_MS);

    return NextResponse.json({ ok: true, reply: reply.trim() });
  } catch (error) {
    if (isAbortError(error)) {
      console.error("AI data query timed out", { message: getErrorMessage(error) });
      return NextResponse.json({ ok: false, reply: AI_TIMEOUT_REPLY }, { status: 200 });
    }
    console.error("AI data query failed", error);
    return NextResponse.json({ ok: false, reply: ERROR_REPLY }, { status: 200 });
  }
}

async function fetchUserDataSummary(supabase: Awaited<ReturnType<typeof createClient>>): Promise<UserDataSummary> {
  const today = todayISO();
  const [year, month] = today.split("-").map(Number);
  const { start: monthStart, end: monthEnd } = monthRange(year, month);
  const { start: weekStart, end: weekEnd } = weekRange(today);

  const [monthTxRes, latestTxRes, pendingTodosRes, overdueTodosRes, todayTodosRes, todayBlocksRes, weekBlocksRes] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("type,amount,category,note,transaction_date,created_at")
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd),
      supabase
        .from("transactions")
        .select("type,amount,category,note,transaction_date,created_at")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("todos")
        .select("id,title,due_date,priority,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("todos")
        .select("id,title,due_date,priority,created_at")
        .eq("status", "pending")
        .lt("due_date", today)
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("todos")
        .select("id,title,due_date,priority,created_at")
        .eq("status", "pending")
        .eq("due_date", today)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("time_blocks")
        .select("title,type,custom_type,start_time,end_time,block_date,note")
        .eq("block_date", today)
        .order("start_time", { ascending: true }),
      supabase
        .from("time_blocks")
        .select("title,type,custom_type,start_time,end_time,block_date,note")
        .gte("block_date", weekStart)
        .lte("block_date", weekEnd),
    ]);

  const monthTransactions = (monthTxRes.data ?? []) as MonthTransaction[];
  const latestTransactions = (latestTxRes.data ?? []) as MonthTransaction[];
  const pendingTodos = (pendingTodosRes.data ?? []) as DashboardTodo[];
  const overdueTodos = (overdueTodosRes.data ?? []) as DashboardTodo[];
  const todayTodos = (todayTodosRes.data ?? []) as DashboardTodo[];
  const todayBlocks = (todayBlocksRes.data ?? []) as TimeBlockRow[];
  const weekBlocks = (weekBlocksRes.data ?? []) as TimeBlockRow[];

  const totalIncome = sumTransactions(monthTransactions, "income");
  const totalExpense = sumTransactions(monthTransactions, "expense");

  logQueryError("month transactions", monthTxRes.error);
  logQueryError("latest transactions", latestTxRes.error);
  logQueryError("pending todos", pendingTodosRes.error);
  logQueryError("overdue todos", overdueTodosRes.error);
  logQueryError("today todos", todayTodosRes.error);
  logQueryError("today time blocks", todayBlocksRes.error);
  logQueryError("week time blocks", weekBlocksRes.error);
  logChatDataQuery("fetched row counts", {
    month_transactions: monthTransactions.length,
    latest_transactions: latestTransactions.length,
    pending_todos: pendingTodos.length,
    overdue_todos: overdueTodos.length,
    today_todos: todayTodos.length,
    today_time_blocks: todayBlocks.length,
    week_time_blocks: weekBlocks.length,
  });

  return {
    dates: { today, month_start: monthStart, month_end: monthEnd, week_start: weekStart, week_end: weekEnd },
    current_month_finance: {
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: totalIncome - totalExpense,
      top_expense_categories: summarizeTopExpenseCategories(monthTransactions),
      transaction_count: monthTransactions.length,
    },
    latest_transactions: latestTransactions.map((transaction) => ({
      type: transaction.type,
      amount: Number(transaction.amount),
      category: transaction.category,
      note: transaction.note,
      date: transaction.transaction_date,
    })),
    todos: {
      pending_count: pendingTodos.length,
      pending: pendingTodos.map(formatTodo),
      overdue_count: overdueTodos.length,
      overdue: overdueTodos.map(formatTodo),
      today_count: todayTodos.length,
      today: todayTodos.map(formatTodo),
    },
    time_blocks: {
      today: todayBlocks.map(formatTimeBlock),
      this_week_hours_by_type: summarizeWeekBlocks(weekBlocks),
    },
  };
}

function detectIntent(message: string): DataQueryIntent {
  const normalized = normalizeVietnamese(message);

  if (/(qua han|tre han|deadline)/u.test(normalized)) return "overdue_todos";
  if (/(thang nay|thang hien tai)/u.test(normalized) && /(thu nhap|thu bao nhieu|kiem duoc)/u.test(normalized)) {
    return "month_income_total";
  }
  if (/(thang nay|thang hien tai)/u.test(normalized) && /(so du|con bao nhieu|con lai|balance)/u.test(normalized)) {
    return "month_balance";
  }
  if (/(thang nay|thang hien tai)/u.test(normalized) && /(tieu nhieu nhat|ton nhieu nhat|danh muc nao|chi nhieu nhat)/u.test(normalized)) {
    return "month_spending_top_category";
  }
  if (/(tuan nay|tuan hien tai|tong gio)/u.test(normalized) && /(hoc|lam viec|gym|truong|nghi|gio|thoi gian)/u.test(normalized)) {
    return "week_time_summary";
  }
  if (/(hom nay|ngay nay)/u.test(normalized) && /(todo|can lam|viec nao|viec can lam)/u.test(normalized)) {
    return "today_todos";
  }
  if (/(hom nay|ngay nay|lich hom nay)/u.test(normalized) && /(lich|phai lam gi|co gi|ke hoach)/u.test(normalized)) {
    return "today_schedule";
  }

  return "complex_analysis";
}

function buildDeterministicReply(intent: DataQueryIntent, message: string, summary: UserDataSummary) {
  switch (intent) {
    case "today_schedule":
      return formatTodaySchedule(summary.time_blocks.today);
    case "overdue_todos":
      return formatOverdueTodos(summary.todos.overdue);
    case "today_todos":
      return formatTodayTodos(summary.todos.today, summary.time_blocks.today);
    case "week_time_summary":
      return formatWeekTimeSummary(summary.time_blocks.this_week_hours_by_type, message);
    case "month_spending_top_category":
      return formatMonthSpendingTopCategory(summary.current_month_finance.top_expense_categories);
    case "month_income_total":
      return `Tháng này bạn đã thu ${formatVnd(summary.current_month_finance.total_income)}.`;
    case "month_balance":
      return `Số dư tháng này của bạn là ${formatVnd(summary.current_month_finance.balance)}.`;
    case "complex_analysis":
      return null;
  }
}

function formatTodaySchedule(blocks: FormattedTimeBlock[]) {
  if (blocks.length === 0) return "Hôm nay bạn chưa có lịch nào.";
  return ["Lịch hôm nay của bạn:", ...blocks.map((block) => `- ${block.start_time}-${block.end_time}: ${block.title} (${block.type})`)].join("\n");
}

function formatOverdueTodos(todos: FormattedTodo[]) {
  if (todos.length === 0) return "Bạn không có todo quá hạn.";
  return ["Todo quá hạn của bạn:", ...todos.map((todo) => `- ${todo.title}${todo.due_date ? ` (hạn ${todo.due_date})` : ""}`)].join("\n");
}

function formatTodayTodos(todos: FormattedTodo[], blocks: FormattedTimeBlock[]) {
  if (todos.length === 0) return "Hôm nay bạn chưa có todo nào đến hạn.";
  const lines = ["Todo đến hạn hôm nay:", ...todos.map((todo) => `- ${todo.title} (${todo.priority})`)];
  if (blocks.length > 0) {
    lines.push("", "Lịch hôm nay:", ...blocks.map((block) => `- ${block.start_time}-${block.end_time}: ${block.title}`));
  }
  return lines.join("\n");
}

function formatWeekTimeSummary(summary: UserDataSummary["time_blocks"]["this_week_hours_by_type"], message: string) {
  if (summary.length === 0) return "Tuần này bạn chưa có khối thời gian nào.";

  const requestedType = detectRequestedTimeType(message);
  if (requestedType) {
    const item = summary.find((entry) => normalizeVietnamese(entry.type) === requestedType);
    return `Tuần này bạn dành ${formatHoursText(item?.hours ?? 0)} cho ${requestedType}.`;
  }

  return ["Tổng giờ tuần này:", ...summary.map((entry) => `- ${entry.type}: ${formatHoursText(entry.hours)}`)].join("\n");
}

function formatMonthSpendingTopCategory(categories: UserDataSummary["current_month_finance"]["top_expense_categories"]) {
  if (categories.length === 0) return "Tháng này bạn chưa có khoản chi nào.";
  const top = categories[0];
  return `Tháng này bạn tiêu nhiều nhất vào ${top.category}: ${formatVnd(top.amount)}.`;
}

function detectRequestedTimeType(message: string) {
  const normalized = normalizeVietnamese(message);
  if (/hoc/u.test(normalized)) return "hoc tap";
  if (/lam viec/u.test(normalized)) return "lam viec";
  if (/gym/u.test(normalized)) return "gym";
  if (/truong/u.test(normalized)) return "truong lop";
  if (/nghi/u.test(normalized)) return "nghi ngoi";
  return null;
}

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

function formatHoursText(hours: number) {
  return `${Math.round(hours * 10) / 10} giờ`;
}

function logChatDataQuery(message: string, details: Record<string, unknown>) {
  console.info("AI chat data query", { message, ...details });
}

function logQueryError(queryName: string, error: { message?: string } | null) {
  if (!error) return;
  console.error("AI chat data query Supabase query failed", {
    query: queryName,
    message: error.message ?? "Unknown Supabase error",
  });
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function buildSystemPrompt() {
  return [
    "Bạn là trợ lý quản lý tài chính cá nhân và thời gian.",
    "Bạn chỉ được trả lời dựa trên user_data_summary được cung cấp.",
    "Nếu dữ liệu thiếu hoặc không đủ để kết luận, hãy nói rõ là chưa có dữ liệu.",
    "Không bịa số liệu, không suy đoán ngoài dữ liệu.",
    "Trả lời bằng tiếng Việt, ngắn gọn, thực tế, ưu tiên gạch đầu dòng khi hữu ích.",
  ].join("\n");
}

function isDataQueryScopedMessage(message: string) {
  const normalized = normalizeVietnamese(message);
  const blockedPattern =
    /(code|coding|javascript|typescript|python|sql|api|debug|bug|lap trinh|loi code|chinh tri|bau cu|thoi tiet|weather|the thao|bong da|trivia|random|joke|viet bai|lam van|giai bai tap|dịch|dich)/iu;
  const allowedPattern =
    /(chi tieu|thu nhap|giao dich|so du|ngan sach|tien|thang nay|todo|viec can lam|deadline|qua han|lich|khoi thoi gian|hom nay|tuan nay|hoc|lam viec|gym|ke hoach|truong|nghi ngoi)/iu;

  return allowedPattern.test(normalized) && !blockedPattern.test(normalized);
}

function normalizeVietnamese(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d");
}

function sumTransactions(transactions: MonthTransaction[], type: TransactionType) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
}

function summarizeTopExpenseCategories(transactions: MonthTransaction[]) {
  const categoryTotals = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      categoryTotals.set(
        transaction.category,
        (categoryTotals.get(transaction.category) ?? 0) + Number(transaction.amount)
      );
    });

  return [...categoryTotals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

function summarizeWeekBlocks(blocks: TimeBlockRow[]) {
  const hoursByType = new Map<string, number>();

  blocks.forEach((block) => {
    const label = getTimeBlockLabel(block);
    const hours = hoursBetween(formatTime(block.start_time), formatTime(block.end_time));
    hoursByType.set(label, (hoursByType.get(label) ?? 0) + hours);
  });

  return [...hoursByType.entries()]
    .map(([type, hours]) => ({ type, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);
}

function formatTodo(todo: DashboardTodo) {
  return {
    title: todo.title,
    due_date: todo.due_date,
    priority: todo.priority,
  };
}

function formatTimeBlock(block: TimeBlockRow) {
  return {
    title: block.title,
    type: getTimeBlockLabel(block),
    start_time: formatTime(block.start_time),
    end_time: formatTime(block.end_time),
    note: block.note,
  };
}

function getTimeBlockLabel(block: Pick<TimeBlockRow, "type" | "custom_type">) {
  if (block.type === "other" && block.custom_type?.trim()) return block.custom_type.trim();
  return TIME_BLOCK_TYPE_LABELS[block.type];
}