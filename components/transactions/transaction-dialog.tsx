"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getCategories } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import type { Transaction, TransactionType } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  // When provided, the dialog edits this transaction; otherwise it creates a new one.
  transaction?: Transaction;
  trigger: React.ReactElement;
  onSaved?: (transaction: Transaction) => void;
};

const TRANSACTION_COLUMNS =
  "id, user_id, type, amount, category, note, transaction_date, created_at, updated_at";

export function TransactionDialog({ transaction, trigger, onSaved }: Props) {
  const isEdit = Boolean(transaction);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? "expense"
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : ""
  );
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [note, setNote] = useState(transaction?.note ?? "");
  const [date, setDate] = useState(
    transaction?.transaction_date ?? todayISO()
  );

  const categories = getCategories(type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ.");
      return;
    }
    if (!category) {
      toast.error("Vui lòng chọn danh mục.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      type,
      amount: amountValue,
      category,
      note: note.trim() || null,
      transaction_date: date,
    };

    let savedTransaction: Transaction | null = null;
    let error;
    if (isEdit && transaction) {
      const result = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", transaction.id)
        .select(TRANSACTION_COLUMNS)
        .single();
      error = result.error;
      savedTransaction = result.data as Transaction | null;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await supabase
        .from("transactions")
        .insert({ ...payload, user_id: user?.id })
        .select(TRANSACTION_COLUMNS)
        .single();
      error = result.error;
      savedTransaction = result.data as Transaction | null;
    }

    setLoading(false);

    if (error) {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      return;
    }

    toast.success(isEdit ? "Đã cập nhật giao dịch." : "Đã thêm giao dịch.");
    if (savedTransaction) {
      onSaved?.(savedTransaction);
    }
    setOpen(false);
  }

  // When switching type, reset category since the list differs.
  function handleTypeChange(value: string | null) {
    setType((value as TransactionType) ?? "expense");
    setCategory("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa giao dịch" : "Thêm giao dịch"}
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin thu nhập hoặc chi tiêu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Loại</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Chi tiêu</SelectItem>
                <SelectItem value="income">Thu nhập</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền (₫)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Danh mục</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory((value as string) ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Ngày</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              placeholder="Tùy chọn"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
