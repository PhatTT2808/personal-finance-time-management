import { createClient } from "@/lib/supabase/server";
import { monthRange, todayISO } from "@/lib/format";
import type { Transaction } from "@/types/database";
import { TransactionsClient } from "@/components/transactions/transactions-client";

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

  const [transactionsResult, monthQuery] = await Promise.all([
    query,
    supabase
      .from("transactions")
      .select("id, user_id, type, amount, category, note, transaction_date, created_at, updated_at")
      .gte("transaction_date", start)
      .lte("transaction_date", end),
  ]);

  const { data } = transactionsResult;
  const transactions = (data ?? []) as Transaction[];
  const monthTransactions = (monthQuery.data ?? []) as Transaction[];

  return (
    <TransactionsClient
      transactions={transactions}
      monthTransactions={monthTransactions}
      year={year}
      month={month}
      type={type}
    />
  );
}
