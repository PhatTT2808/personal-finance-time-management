import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { monthRange, formatCurrency, todayISO } from "@/lib/format";
import type { Transaction } from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; type?: string }>;
}) {
  const params = await searchParams;
  const now = todayISO();
  const [defaultYear, defaultMonth] = now.split("-").map(Number);

  const year = Number(params.year) || defaultYear;
  const month = Number(params.month) || defaultMonth;
  const type = params.type === "income" || params.type === "expense"
    ? params.type
    : "all";

  const { start, end } = monthRange(year, month);

  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("*")
    .gte("transaction_date", start)
    .lte("transaction_date", end)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (type !== "all") {
    query = query.eq("type", type);
  }

  const { data } = await query;
  const transactions = (data ?? []) as Transaction[];

  // Totals are computed from the month range, regardless of the type filter,
  // so balance always reflects the full month.
  const monthQuery = await supabase
    .from("transactions")
    .select("type, amount")
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  const monthRows = (monthQuery.data ?? []) as Pick<
    Transaction,
    "type" | "amount"
  >[];
  const totalIncome = monthRows
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = monthRows
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  return (
    <div>
      <PageHeader
        title="Giao dịch"
        description="Quản lý thu nhập và chi tiêu của bạn."
        action={
          <TransactionDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm giao dịch
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng thu nhập"
          value={formatCurrency(totalIncome)}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClassName="text-emerald-600"
        />
        <StatCard
          label="Tổng chi tiêu"
          value={formatCurrency(totalExpense)}
          icon={<TrendingDown className="h-5 w-5" />}
          valueClassName="text-rose-600"
        />
        <StatCard
          label="Số dư"
          value={formatCurrency(balance)}
          icon={<Wallet className="h-5 w-5" />}
          valueClassName={balance >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      <div className="mb-4">
        <TransactionFilters year={year} month={month} type={type} />
      </div>

      <TransactionsTable transactions={transactions} />
    </div>
  );
}
