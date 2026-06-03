"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";

export function TransactionsTable({
  transactions,
  onSaved,
  onDeleted,
}: {
  transactions: Transaction[];
  onSaved?: (transaction: Transaction) => void;
  onDeleted?: (id: string) => void;
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-8 text-center text-sm text-slate-400 shadow-2xl shadow-black/20 ring-1 ring-white/5 backdrop-blur">
        Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 shadow-2xl shadow-black/25 ring-1 ring-white/5 backdrop-blur">
      <Table className="text-slate-200">
        <TableHeader className="bg-white/[0.04] [&_tr]:border-white/10">
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Ngày</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Loại</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Danh mục</TableHead>
            <TableHead className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:table-cell">Ghi chú</TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Số tiền</TableHead>
            <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id} className="border-white/10 hover:bg-white/[0.035]">
              <TableCell className="whitespace-nowrap text-slate-300">
                {formatDate(t.transaction_date)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={t.type === "income" ? "default" : "secondary"}
                  className={
                    t.type === "income"
                      ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                      : "border border-rose-300/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15"
                  }
                >
                  {t.type === "income" ? "Thu" : "Chi"}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-slate-100">{t.category}</TableCell>
              <TableCell className="hidden max-w-40 truncate text-slate-400 sm:table-cell">
                {t.note ?? "-"}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  t.type === "income" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {t.type === "income" ? "+" : "-"}
                {formatCurrency(t.amount)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <TransactionDialog
                    transaction={t}
                    onSaved={onSaved}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Sửa" className="text-slate-400 hover:bg-sky-400/10 hover:text-sky-200 focus-visible:border-sky-300/40 focus-visible:ring-sky-300/20">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <ConfirmDelete
                    table="transactions"
                    id={t.id}
                    onDeleted={() => onDeleted?.(t.id)}
                    description="Bạn có chắc chắn muốn xóa giao dịch này không?"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Xóa"
                        className="text-rose-300/80 hover:bg-rose-400/10 hover:text-rose-200 focus-visible:border-rose-300/40 focus-visible:ring-rose-300/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
