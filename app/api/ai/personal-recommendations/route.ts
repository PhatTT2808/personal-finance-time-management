import { NextResponse } from "next/server";

import { TIME_BLOCK_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatTime, hoursBetween, monthRange, todayISO, weekRange } from "@/lib/format";
import { createKimiJsonCompletion } from "@/lib/ai/model/kimi-client";
import { createClient } from "@/lib/supabase/server";
import type { TimeBlockType, TodoPriority, TransactionType } from "@/types/database";

const MAX_MESSAGE_LENGTH = 1000;
const AI_TIMEOUT_MS = 30_000;
const AUTH_REPLY = "Bạn cần đăng nhập để sử dụng trợ lý AI.";
const OUT_OF_SCOPE_REPLY = "Mình chỉ hỗ trợ gợi ý liên quan đến chi tiêu, todo, lịch và quản lý thời gian.";
const ERROR_REPLY = "Mình chưa đưa ra gợi ý được lúc này. Bạn thử lại sau nhé.";
const QUICK_RECOMMENDATION_NOTE = "Mình đang dùng gợi ý nhanh vì AI phản hồi chưa ổn định.";
const LOW_DATA_REPLY =
  "Hiện dữ liệu của bạn còn ít, mình gợi ý bạn nên ghi thêm chi tiêu, todo và lịch để nhận gợi ý chính xác hơn.";

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
type UserRecommendationSummary = {
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
    this_week_total_hours: number;
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

    if (!isPersonalRecommendationScopedMessage(message)) {
      logPersonalRecommendations("request blocked", { ai_called: false });
      return NextResponse.json({ ok: false, reply: OUT_OF_SCOPE_REPLY });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, reply: AUTH_REPLY }, { status: 401 });
    }

    const summary = await fetchUserRecommendationSummary(supabase);
    const deterministicReply = buildDeterministicRecommendations(summary);
    const useAiPolish = shouldUseAiPolish(message);

    logPersonalRecommendations("answer source", {
      recommendation_source: "deterministic",
      ai_called: false,
      ai_polish_skipped: !useAiPolish,
      month_transactions: summary.current_month_finance.transaction_count,
      latest_transactions: summary.latest_transactions.length,
      pending_todos: summary.todos.pending_count,
      overdue_todos: summary.todos.overdue_count,
      today_todos: summary.todos.today_count,
      today_time_blocks: summary.time_blocks.today.length,
      week_time_block_types: summary.time_blocks.this_week_hours_by_type.length,
    });

    if (!useAiPolish) {
      return NextResponse.json({ ok: true, reply: deterministicReply });
    }

    const aiReply = await tryPolishRecommendations(message, summary, deterministicReply);

    if (aiReply) {
      logPersonalRecommendations("answer source", {
        recommendation_source: "ai_polished",
        ai_called: true,
        ai_polish_skipped: false,
      });
      return NextResponse.json({ ok: true, reply: aiReply });
    }

    return NextResponse.json({ ok: true, reply: `${deterministicReply}\n\n${QUICK_RECOMMENDATION_NOTE}` });
  } catch (error) {
    console.error("AI personal recommendations failed", error);
    return NextResponse.json({ ok: false, reply: ERROR_REPLY }, { status: 200 });
  }
}

async function tryPolishRecommendations(
  message: string,
  summary: UserRecommendationSummary,
  deterministicReply: string
) {
  try {
    logPersonalRecommendations("ai polish attempt", {
      recommendation_source: "deterministic",
      ai_called: true,
      ai_polish_skipped: false,
    });

    const reply = await createKimiJsonCompletion(
      [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: JSON.stringify({ message, user_summary: summary, draft_recommendations: deterministicReply }) },
      ],
      AI_TIMEOUT_MS
    );

    return reply.trim() || null;
  } catch (error) {
    logAiFallback(error);
    return null;
  }
}

async function fetchUserRecommendationSummary(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<UserRecommendationSummary> {
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

  logQueryError("month transactions", monthTxRes.error);
  logQueryError("latest transactions", latestTxRes.error);
  logQueryError("pending todos", pendingTodosRes.error);
  logQueryError("overdue todos", overdueTodosRes.error);
  logQueryError("today todos", todayTodosRes.error);
  logQueryError("today time blocks", todayBlocksRes.error);
  logQueryError("week time blocks", weekBlocksRes.error);
  logPersonalRecommendations("fetched row counts", {
    ai_called: false,
    month_transactions: monthTransactions.length,
    latest_transactions: latestTransactions.length,
    pending_todos: pendingTodos.length,
    overdue_todos: overdueTodos.length,
    today_todos: todayTodos.length,
    today_time_blocks: todayBlocks.length,
    week_time_blocks: weekBlocks.length,
  });

  const totalIncome = sumTransactions(monthTransactions, "income");
  const totalExpense = sumTransactions(monthTransactions, "expense");
  const weekHoursByType = summarizeWeekBlocks(weekBlocks);

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
      this_week_total_hours: weekHoursByType.reduce((sum, entry) => sum + entry.hours, 0),
      this_week_hours_by_type: weekHoursByType,
    },
  };
}

function buildSystemPrompt() {
  return [
    "Bạn là coach quản lý tài chính cá nhân và quản lý thời gian.",
    "Bạn chỉ được viết lại draft_recommendations được cung cấp, không thêm ý mới.",
    "Không bịa dữ liệu, không suy đoán số liệu ngoài user_summary và draft_recommendations.",
    "Chỉ đưa ra khuyến nghị liên quan đến chi tiêu, tiết kiệm, todo, lịch, học, làm việc, gym và cân bằng thời gian.",
    "Không tạo, sửa hoặc xóa bản ghi; chỉ tư vấn.",
    "Trả lời bằng tiếng Việt, ngắn gọn, thực tế, ưu tiên gạch đầu dòng.",
    "Tránh lên lớp đạo đức và tránh trả lời quá dài.",
  ].join("\n");
}

function buildDeterministicRecommendations(summary: UserRecommendationSummary) {
  const recommendations: string[] = [];
  const topExpenseCategory = summary.current_month_finance.top_expense_categories[0];
  const studyHours = getWeekHoursByType(summary, "Học");
  const gymHours = getWeekHoursByType(summary, "Gym");

  if (summary.todos.overdue_count > 0) {
    recommendations.push(`Ưu tiên xử lý ${summary.todos.overdue_count} todo quá hạn trước để giảm tồn đọng.`);
  }

  if (summary.todos.pending_count > 0) {
    recommendations.push("Chọn 1-3 todo quan trọng nhất để hoàn thành trong hôm nay, đừng ôm quá nhiều việc.");
  }

  if (studyHours < 5) {
    recommendations.push(`Tuần này mới có ${formatHourValue(studyHours)} giờ học; nên thêm 1-2 block học tập.`);
  }

  if (gymHours === 0) {
    recommendations.push("Tuần này chưa có block gym; nên thêm ít nhất một block gym hoặc nghỉ ngơi chăm sóc sức khỏe.");
  }

  if (topExpenseCategory) {
    recommendations.push(
      `Khoản chi lớn nhất tháng này là ${topExpenseCategory.category} (${formatCurrency(topExpenseCategory.amount)}); nên theo dõi kỹ nhóm này.`
    );
  }

  if (summary.current_month_finance.total_expense > summary.current_month_finance.total_income) {
    recommendations.push("Chi tiêu tháng này đang cao hơn thu nhập; nên rà lại các khoản chưa cần thiết trong tuần này.");
  }

  if (summary.time_blocks.today.length === 0) {
    recommendations.push("Hôm nay chưa có time block; nên tạo ít nhất một block tập trung cho việc quan trọng nhất.");
  }

  if (recommendations.length === 0 || hasLimitedRecommendationData(summary)) {
    recommendations.push(LOW_DATA_REPLY);
  }

  return recommendations.map((recommendation) => `- ${recommendation}`).join("\n");
}

function getWeekHoursByType(summary: UserRecommendationSummary, type: string) {
  return summary.time_blocks.this_week_hours_by_type.find((entry) => entry.type === type)?.hours ?? 0;
}

function formatHourValue(hours: number) {
  return (Math.round(hours * 10) / 10).toString();
}

function hasLimitedRecommendationData(summary: UserRecommendationSummary) {
  return (
    summary.current_month_finance.transaction_count === 0 &&
    summary.todos.pending_count === 0 &&
    summary.time_blocks.today.length === 0 &&
    summary.time_blocks.this_week_total_hours === 0
  );
}

function isPersonalRecommendationScopedMessage(message: string) {
  const normalized = normalizeVietnamese(message);
  const blockedPattern =
    /(code|coding|javascript|typescript|python|sql|api|debug|bug|lap trinh|loi code|chinh tri|bau cu|thoi tiet|weather|the thao|bong da|trivia|random|joke|viet bai|lam van|giai bai tap|bai tap|homework|dich)/iu;
  const allowedPattern =
    /(cai thien|goi y|loi khuyen|nen lam gi|nen hoc gi|uu tien|ke hoach|chi tieu|tiet kiem|giam khoan chi|hoc|gym|todo|lich|thoi gian|thu chi|ngan sach|tien|can bang|lam viec)/iu;

  return allowedPattern.test(normalized) && !blockedPattern.test(normalized);
}

function shouldUseAiPolish(message: string) {
  const normalized = normalizeVietnamese(message);
  const deepAnalysisPattern =
    /(phan tich chi tiet|phan tich sau|lap ke hoach|chien luoc|ke hoach 7 ngay|ca nhan hoa hon)/iu;

  return deepAnalysisPattern.test(normalized);
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
      categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + Number(transaction.amount));
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

function logPersonalRecommendations(message: string, details: Record<string, unknown>) {
  console.info("AI personal recommendations", { mode: "personal_recommendations", message, ...details });
}

function logQueryError(queryName: string, error: { message?: string } | null) {
  if (!error) return;
  console.error("AI personal recommendations Supabase query failed", {
    query: queryName,
    message: error.message ?? "Unknown Supabase error",
  });
}

function logAiFallback(error: unknown) {
  console.warn("AI personal recommendations polish failed", {
    mode: "personal_recommendations",
    recommendation_source: "deterministic",
    ai_called: true,
    ai_polish_skipped: false,
    ai_error_status: getAiErrorStatus(error),
    ai_error_name: error instanceof Error ? error.name : "UnknownError",
    ai_error_message: getErrorMessage(error),
  });
}

function getAiErrorStatus(error: unknown) {
  if (isAbortError(error)) return "timeout";
  const message = getErrorMessage(error);
  const statusMatch = message.match(/AI API error: (\d{3})/u);
  return statusMatch?.[1] ?? "unknown";
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}