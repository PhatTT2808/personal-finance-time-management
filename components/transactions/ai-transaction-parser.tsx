"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { ParsedTransaction, TransactionParseResult } from "@/lib/ai/types";
import { formatCurrency } from "@/lib/format";
import type { Transaction } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onSaved: (transactions: Transaction[]) => void;
};

type BulkCreateResponse =
  | { ok: true; transactions: Transaction[] }
  | { ok: false; error?: string; details?: { index: number; fields: string[] }[] };

export function AiTransactionParser({ onSaved }: Props) {
  const [message, setMessage] = useState("");
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleParse() {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập nội dung giao dịch.");
      return;
    }

    setParsing(true);
    setQuestion(null);
    setTransactions([]);

    try {
      const response = await fetch("/api/ai/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const result = (await response.json()) as TransactionParseResult;

      if (!result.ok) {
        setQuestion(result.question ?? "Bạn có thể nói rõ hơn giao dịch này không?");
        return;
      }

      setTransactions(result.transactions);
      toast.success("Đã phân tích giao dịch. Vui lòng kiểm tra trước khi lưu.");
    } catch {
      toast.error("Không thể phân tích. Vui lòng thử lại.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSaveAll() {
    if (transactions.length === 0) return;

    setSaving(true);
    try {
      const payloadTransactions = transactions.map(normalizeTransactionForSave);
      const response = await fetch("/api/transactions/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: payloadTransactions }),
      });
      const result = (await response.json()) as BulkCreateResponse;

      if (!response.ok || !result.ok) {
        const baseError = !result.ok && result.error ? result.error : "Không thể lưu giao dịch.";
        const devDetails = !result.ok && process.env.NODE_ENV !== "production" && result.details?.length
          ? ` Chi tiết: ${result.details
              .map((detail) => `dòng ${detail.index + 1}: ${detail.fields.join(", ")}`)
              .join("; ")}`
          : "";
        toast.error(`${baseError}${devDetails}`);
        return;
      }

      onSaved(result.transactions);
      toast.success(`Đã lưu ${result.transactions.length} giao dịch.`);
      handleCancel();
    } catch {
      toast.error("Không thể lưu giao dịch. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setMessage("");
    setTransactions([]);
    setQuestion(null);
  }

  return (
    <Card className="mb-6 border-sky-300/15 bg-slate-950/65 shadow-2xl shadow-sky-950/20 ring-sky-300/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Sparkles className="h-5 w-5 text-sky-300" />
          Ghi giao dịch bằng AI
        </CardTitle>
        <CardDescription>
          Nhập thu nhập hoặc chi tiêu bằng tiếng Việt, kiểm tra bản xem trước rồi mới lưu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ví dụ: 200k ăn hủ tiếu, 100k nước mía, +1000k từ shipper"
          className="min-h-24 border-white/10 bg-white/[0.03] text-slate-100 placeholder:text-slate-500"
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleParse} disabled={parsing || saving}>
            {parsing ? "Đang phân tích..." : "Phân tích"}
          </Button>
          {(transactions.length > 0 || question) && (
            <Button variant="outline" onClick={handleCancel} disabled={parsing || saving}>
              <X className="mr-2 h-4 w-4" />
              Hủy
            </Button>
          )}
        </div>

        {question && (
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
            {question}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-5 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span>Loại</span>
                <span>Số tiền</span>
                <span>Danh mục</span>
                <span>Ghi chú</span>
                <span>Ngày</span>
              </div>
              {transactions.map((transaction, index) => (
                <div
                  key={`${transaction.type}-${transaction.amount}-${transaction.note}-${index}`}
                  className="grid grid-cols-5 gap-2 border-t border-white/10 px-3 py-3 text-sm text-slate-200"
                >
                  <span>
                    <Badge variant={transaction.type === "income" ? "default" : "secondary"}>
                      {transaction.type === "income" ? "Thu" : "Chi"}
                    </Badge>
                  </span>
                  <span className={transaction.type === "income" ? "text-emerald-300" : "text-rose-300"}>
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <span>{transaction.category}</span>
                  <span className="truncate text-slate-400">{transaction.note ?? "-"}</span>
                  <span>{transaction.transaction_date}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveAll} disabled={saving || parsing}>
                {saving ? "Đang lưu..." : "Lưu tất cả"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving || parsing}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function normalizeTransactionForSave(transaction: ParsedTransaction): ParsedTransaction {
  const type = transaction.type === "income" ? "income" : "expense";
  const amount = Math.abs(Number(transaction.amount));
  const category = typeof transaction.category === "string" && transaction.category.trim()
    ? transaction.category.trim()
    : "Khác";
  const note = typeof transaction.note === "string" && transaction.note.trim() ? transaction.note.trim() : null;
  const transactionDate = isValidISODate(transaction.transaction_date) ? transaction.transaction_date : todayLocalISO();

  return {
    type,
    amount: Math.round(amount),
    category,
    note,
    transaction_date: transactionDate,
  };
}

function isValidISODate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayLocalISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
