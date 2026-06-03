"use client";

import { useMemo, useState } from "react";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { AiTransactionParser } from "@/components/transactions/ai-transaction-parser";

type Props = {
  transactions: Transaction[];
  monthTransactions: Transaction[];
  year: number;
  month: number;
  type: "all" | "income" | "expense";
};

export function TransactionsClient({
  transactions,
  monthTransactions,
  year,
  month,
  type,
}: Props) {
  const [visibleTransactions, setVisibleTransactions] = useState(transactions);
  const [monthlyTransactions, setMonthlyTransactions] = useState(monthTransactions);

  const totals = useMemo(() => {
    const totalIncome = monthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = monthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [monthlyTransactions]);

  function isInCurrentMonth(transaction: Transaction) {
    const [transactionYear, transactionMonth] = transaction.transaction_date
      .split("-")
      .map(Number);
    return transactionYear === year && transactionMonth === month;
  }

  function matchesCurrentFilter(transaction: Transaction) {
    return isInCurrentMonth(transaction) && (type === "all" || transaction.type === type);
  }

  function sortTransactions(rows: Transaction[]) {
    return [...rows].sort((a, b) => {
      const dateCompare = b.transaction_date.localeCompare(a.transaction_date);
      if (dateCompare !== 0) return dateCompare;
      return b.created_at.localeCompare(a.created_at);
    });
  }

  function upsertTransaction(transaction: Transaction) {
    setMonthlyTransactions((current) => {
      const withoutCurrent = current.filter((item) => item.id !== transaction.id);
      return isInCurrentMonth(transaction)
        ? sortTransactions([...withoutCurrent, transaction])
        : withoutCurrent;
    });

    setVisibleTransactions((current) => {
      const withoutCurrent = current.filter((item) => item.id !== transaction.id);
      return matchesCurrentFilter(transaction)
        ? sortTransactions([...withoutCurrent, transaction])
        : withoutCurrent;
    });
  }

  function upsertTransactions(transactionsToSave: Transaction[]) {
    setMonthlyTransactions((current) => {
      const savedIds = new Set(transactionsToSave.map((item) => item.id));
      const withoutSaved = current.filter((item) => !savedIds.has(item.id));
      return sortTransactions([
        ...withoutSaved,
        ...transactionsToSave.filter(isInCurrentMonth),
      ]);
    });

    setVisibleTransactions((current) => {
      const savedIds = new Set(transactionsToSave.map((item) => item.id));
      const withoutSaved = current.filter((item) => !savedIds.has(item.id));
      return sortTransactions([
        ...withoutSaved,
        ...transactionsToSave.filter(matchesCurrentFilter),
      ]);
    });
  }

  function deleteTransaction(id: string) {
    setMonthlyTransactions((current) => current.filter((item) => item.id !== id));
    setVisibleTransactions((current) => current.filter((item) => item.id !== id));
  }

  return (
    <>
      <PageHeader
        title="Giao dịch"
        description="Quản lý thu nhập và chi tiêu của bạn."
        action={
          <TransactionDialog
            onSaved={upsertTransaction}
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
          value={formatCurrency(totals.totalIncome)}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClassName="text-emerald-600"
        />
        <StatCard
          label="Tổng chi tiêu"
          value={formatCurrency(totals.totalExpense)}
          icon={<TrendingDown className="h-5 w-5" />}
          valueClassName="text-rose-600"
        />
        <StatCard
          label="Số dư"
          value={formatCurrency(totals.balance)}
          icon={<Wallet className="h-5 w-5" />}
          valueClassName={totals.balance >= 0 ? "text-emerald-600" : "text-rose-600"}
        />
      </div>

      <AiTransactionParser onSaved={upsertTransactions} />

      <div className="mb-4">
        <TransactionFilters year={year} month={month} type={type} />
      </div>

      <TransactionsTable
        transactions={visibleTransactions}
        onSaved={upsertTransaction}
        onDeleted={deleteTransaction}
      />
    </>
  );
}