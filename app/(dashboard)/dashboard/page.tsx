import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  ListTodo,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  todayISO,
  monthRange,
  weekRange,
  formatCurrency,
  formatDate,
  formatTime,
  formatHours,
  hoursBetween,
} from "@/lib/format";
import { TIME_BLOCK_TYPE_LABELS } from "@/lib/constants";
import type { Transaction, TimeBlock, Todo } from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { ExpenseByCategory } from "@/components/dashboard/expense-by-category";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const today = todayISO();
  const [year, month] = today.split("-").map(Number);
  const { start: monthStart, end: monthEnd } = monthRange(year, month);
  const { start: weekStart, end: weekEnd } = weekRange(today);

  const supabase = await createClient();

  // Run the independent queries in parallel.
  const [monthTxRes, recentTxRes, weekBlocksRes, todosRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd),
    supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("time_blocks")
      .select("*")
      .gte("block_date", weekStart)
      .lte("block_date", weekEnd)
      .order("start_time", { ascending: true }),
    supabase.from("todos").select("*"),
  ]);

  const monthTx = (monthTxRes.data ?? []) as Transaction[];
  const recentTx = (recentTxRes.data ?? []) as Transaction[];
  const weekBlocks = (weekBlocksRes.data ?? []) as TimeBlock[];
  const todos = (todosRes.data ?? []) as Todo[];

  // --- Finance ---
  const totalIncome = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  // Expense by category (this month).
  const categoryMap = new Map<string, number>();
  monthTx
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryMap.set(
        t.category,
        (categoryMap.get(t.category) ?? 0) + Number(t.amount)
      );
    });
  const expenseRows = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // --- Time ---
  const todayBlocks = weekBlocks.filter((b) => b.block_date === today);
  const focusHours = todayBlocks
    .filter((b) => ["study", "work", "gym"].includes(b.type))
    .reduce(
      (s, b) =>
        s + hoursBetween(formatTime(b.start_time), formatTime(b.end_time)),
      0
    );

  // Week summary grouped by type.
  const typeHours = new Map<string, number>();
  weekBlocks.forEach((b) => {
    const h = hoursBetween(formatTime(b.start_time), formatTime(b.end_time));
    typeHours.set(b.type, (typeHours.get(b.type) ?? 0) + h);
  });

  // --- Todos ---
  const pending = todos.filter((t) => t.status === "pending");
  const overdue = pending.filter((t) => t.due_date && t.due_date < today);

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển"
        description="Tổng quan tài chính và thời gian của bạn."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Thu nhập tháng này"
          value={formatCurrency(totalIncome)}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClassName="text-emerald-600"
        />
        <StatCard
          label="Chi tiêu tháng này"
          value={formatCurrency(totalExpense)}
          icon={<TrendingDown className="h-5 w-5" />}
          valueClassName="text-rose-600"
        />
        <StatCard
          label="Số dư hiện tại"
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
          label="Việc cần làm"
          value={String(pending.length)}
          icon={<ListTodo className="h-5 w-5" />}
        />
        <StatCard
          label="Việc quá hạn"
          value={String(overdue.length)}
          icon={<AlertCircle className="h-5 w-5" />}
          valueClassName={overdue.length > 0 ? "text-rose-600" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
            <Link
              href="/transactions"
              className="text-sm text-primary underline"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có giao dịch nào.
              </p>
            ) : (
              <div className="space-y-3">
                {recentTx.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.transaction_date)}
                      </p>
                    </div>
                    <span
                      className={
                        t.type === "income"
                          ? "font-medium text-emerald-600"
                          : "font-medium text-rose-600"
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

        {/* Today schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Lịch hôm nay</CardTitle>
            <Link
              href="/time-blocks"
              className="text-sm text-primary underline"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent>
            {todayBlocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có lịch cho hôm nay.
              </p>
            ) : (
              <div className="space-y-3">
                {todayBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(b.start_time)} - {formatTime(b.end_time)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {TIME_BLOCK_TYPE_LABELS[b.type]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week time summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tổng giờ trong tuần</CardTitle>
          </CardHeader>
          <CardContent>
            {weekBlocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có khối thời gian trong tuần này.
              </p>
            ) : (
              <div className="space-y-2">
                {Array.from(typeHours.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, hours]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {TIME_BLOCK_TYPE_LABELS[
                          type as keyof typeof TIME_BLOCK_TYPE_LABELS
                        ]}
                      </span>
                      <span className="font-medium">
                        {formatHours(hours)} giờ
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense by category */}
        <ExpenseByCategory rows={expenseRows} />
      </div>
    </div>
  );
}
