import Link from "next/link";
import {
  AlertCircle,
  Clock,
  ListTodo,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDate,
  formatHours,
  formatTime,
  hoursBetween,
  monthRange,
  todayISO,
  weekRange,
} from "@/lib/format";
import {
  TIME_BLOCK_TYPE_LABELS,
  TIME_BLOCK_TYPES,
  TODO_PRIORITY_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/constants";
import type {
  TimeBlockType,
  TodoPriority,
  TransactionType,
} from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthTransaction = { type: TransactionType; amount: number };
type RecentTransaction = MonthTransaction & {
  id: string;
  category: string;
  transaction_date: string;
};
type TodayTimeBlock = {
  id: string;
  title: string;
  type: TimeBlockType;
  custom_type: string | null;
  start_time: string;
  end_time: string;
  block_date: string;
  note: string | null;
};
type WeekTimeBlock = {
  type: TimeBlockType;
  start_time: string;
  end_time: string;
};
type DashboardTodo = {
  id: string;
  title: string;
  due_date: string | null;
  priority: TodoPriority;
  created_at: string;
};

export default async function DashboardPage() {
  const today = todayISO();
  const [year, month] = today.split("-").map(Number);
  const { start: monthStart, end: monthEnd } = monthRange(year, month);
  const { start: weekStart, end: weekEnd } = weekRange(today);
  const supabase = await createClient();

  const [
    monthTxRes,
    recentTxRes,
    todayBlocksRes,
    weekBlocksRes,
    todayTodosRes,
    overdueTodosRes,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("type,amount")
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd),
    supabase
      .from("transactions")
      .select("id,type,category,amount,transaction_date,created_at")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("time_blocks")
      .select("id,title,type,custom_type,start_time,end_time,block_date,note")
      .eq("block_date", today)
      .order("start_time", { ascending: true }),
    supabase
      .from("time_blocks")
      .select("type,start_time,end_time")
      .gte("block_date", weekStart)
      .lte("block_date", weekEnd),
    supabase
      .from("todos")
      .select("id,title,due_date,priority,created_at")
      .eq("status", "pending")
      .eq("due_date", today)
      .order("created_at", { ascending: false }),
    supabase
      .from("todos")
      .select("id,title,due_date,priority,created_at")
      .eq("status", "pending")
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const monthTx = (monthTxRes.data ?? []) as MonthTransaction[];
  const recentTx = (recentTxRes.data ?? []) as RecentTransaction[];
  const todayBlocks = (todayBlocksRes.data ?? []) as TodayTimeBlock[];
  const weekBlocks = (weekBlocksRes.data ?? []) as WeekTimeBlock[];
  const todayTodos = (todayTodosRes.data ?? []) as DashboardTodo[];
  const overdueTodos = (overdueTodosRes.data ?? []) as DashboardTodo[];

  const totalIncome = monthTx
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;
  const focusHours = todayBlocks
    .filter((b) => ["study", "work", "gym"].includes(b.type))
    .reduce(
      (sum, b) =>
        sum + hoursBetween(formatTime(b.start_time), formatTime(b.end_time)),
      0,
    );
  const typeHours = new Map<TimeBlockType, number>(
    TIME_BLOCK_TYPES.map((type) => [type, 0]),
  );
  weekBlocks.forEach((b) =>
    typeHours.set(
      b.type,
      (typeHours.get(b.type) ?? 0) +
        hoursBetween(formatTime(b.start_time), formatTime(b.end_time)),
    ),
  );
  const pendingTodoCount = todayTodos.length + overdueTodos.length;

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển"
        description="Tổng quan nhanh về tiền bạc, lịch hôm nay và việc cần làm."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Tổng thu tháng này"
          value={formatCurrency(totalIncome)}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClassName="text-emerald-600"
        />
        <StatCard
          label="Tổng chi tháng này"
          value={formatCurrency(totalExpense)}
          icon={<TrendingDown className="h-5 w-5" />}
          valueClassName="text-rose-600"
        />
        <StatCard
          label="Số dư tháng này"
          value={formatCurrency(balance)}
          icon={<Wallet className="h-5 w-5" />}
          valueClassName={balance >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
        <StatCard
          label="Giờ học/làm/gym hôm nay"
          value={`${formatHours(focusHours)} giờ`}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Todo đang chờ"
          value={String(pendingTodoCount)}
          icon={<ListTodo className="h-5 w-5" />}
        />
        <StatCard
          label="Todo quá hạn"
          value={String(overdueTodos.length)}
          icon={<AlertCircle className="h-5 w-5" />}
          valueClassName={overdueTodos.length > 0 ? "text-rose-600" : undefined}
        />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TodaySchedule blocks={todayBlocks} />
        <TodayTodos todayTodos={todayTodos} overdueTodos={overdueTodos} />
        <RecentTransactions transactions={recentTx} />
        <WeekTimeSummary typeHours={typeHours} />
      </div>
    </div>
  );
}

function TodaySchedule({ blocks }: { blocks: TodayTimeBlock[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Lịch hôm nay</CardTitle>
        <Link href="/time-blocks" className="text-sm text-primary underline">
          Xem tất cả
        </Link>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Hôm nay chưa có lịch nào.
          </p>
        ) : (
          <div className="space-y-3">
            {blocks.map((b) => {
              const typeLabel =
                b.type === "other" && b.custom_type?.trim()
                  ? b.custom_type.trim()
                  : TIME_BLOCK_TYPE_LABELS[b.type];

              return (
                <div
                  key={b.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(b.start_time)} - {formatTime(b.end_time)}
                    </p>
                    {b.note && (
                      <p className="truncate text-xs text-muted-foreground">
                        {b.note}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {typeLabel}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodayTodos({
  todayTodos,
  overdueTodos,
}: {
  todayTodos: DashboardTodo[];
  overdueTodos: DashboardTodo[];
}) {
  const total = todayTodos.length + overdueTodos.length;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Việc cần làm hôm nay</CardTitle>
        <Link href="/todos" className="text-sm text-primary underline">
          Xem tất cả
        </Link>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Không có việc cần làm hôm nay.
          </p>
        ) : (
          <div className="space-y-4">
            {todayTodos.length > 0 && (
              <TodoList title="Đến hạn hôm nay" todos={todayTodos} />
            )}
            {overdueTodos.length > 0 && (
              <TodoList title="Quá hạn" todos={overdueTodos} isOverdue />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodoList({
  title,
  todos,
  isOverdue = false,
}: {
  title: string;
  todos: DashboardTodo[];
  isOverdue?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{todo.title}</p>
              <p
                className={
                  isOverdue
                    ? "text-xs text-rose-600"
                    : "text-xs text-muted-foreground"
                }
              >
                {todo.due_date ? formatDate(todo.due_date) : "Không có hạn"}
              </p>
            </div>
            <Badge variant={isOverdue ? "destructive" : "secondary"}>
              {TODO_PRIORITY_LABELS[todo.priority]}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentTransactions({
  transactions,
}: {
  transactions: RecentTransaction[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
        <Link href="/transactions" className="text-sm text-primary underline">
          Xem tất cả
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có giao dịch nào.
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {TRANSACTION_TYPE_LABELS[t.type]} - {t.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.transaction_date)}
                  </p>
                </div>
                <span
                  className={
                    t.type === "income"
                      ? "shrink-0 font-medium text-emerald-600"
                      : "shrink-0 font-medium text-rose-600"
                  }
                >
                  {t.type === "income" ? "+" : "-"}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeekTimeSummary({
  typeHours,
}: {
  typeHours: Map<TimeBlockType, number>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tổng giờ tuần này</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIME_BLOCK_TYPES.map((type) => (
            <div key={type} className="rounded-lg border bg-card p-3 text-sm">
              <p className="text-muted-foreground">
                {TIME_BLOCK_TYPE_LABELS[type]}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {formatHours(typeHours.get(type) ?? 0)} giờ
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
