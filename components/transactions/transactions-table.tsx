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
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Danh mục</TableHead>
            <TableHead className="hidden sm:table-cell">Ghi chú</TableHead>
            <TableHead className="text-right">Số tiền</TableHead>
            <TableHead className="w-20 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="whitespace-nowrap">
                {formatDate(t.transaction_date)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={t.type === "income" ? "default" : "secondary"}
                  className={
                    t.type === "income"
                      ? "bg-emerald-600 hover:bg-emerald-600"
                      : "bg-rose-600 text-white hover:bg-rose-600"
                  }
                >
                  {t.type === "income" ? "Thu" : "Chi"}
                </Badge>
              </TableCell>
              <TableCell>{t.category}</TableCell>
              <TableCell className="hidden max-w-40 truncate sm:table-cell">
                {t.note ?? "-"}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  t.type === "income" ? "text-emerald-600" : "text-rose-600"
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
                      <Button variant="ghost" size="icon" aria-label="Sửa">
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
                        className="text-rose-600"
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
