"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { TODO_PRIORITIES, TODO_PRIORITY_LABELS } from "@/lib/constants";
import type { Todo, TodoPriority } from "@/types/database";
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
  todo?: Todo;
  trigger: React.ReactElement;
  onSaved?: (todo: Todo) => void;
};

const TODO_COLUMNS =
  "id, user_id, title, description, status, due_date, priority, created_at, updated_at";

export function TodoDialog({ todo, trigger, onSaved }: Props) {
  const isEdit = Boolean(todo);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [dueDate, setDueDate] = useState(todo?.due_date ?? "");
  const [priority, setPriority] = useState<TodoPriority>(
    todo?.priority ?? "medium"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      priority,
    };

    let savedTodo: Todo | null = null;
    let error;
    if (isEdit && todo) {
      const result = await supabase
        .from("todos")
        .update(payload)
        .eq("id", todo.id)
        .select(TODO_COLUMNS)
        .single();
      error = result.error;
      savedTodo = result.data as Todo | null;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const result = await supabase
        .from("todos")
        .insert({ ...payload, status: "pending", user_id: user?.id })
        .select(TODO_COLUMNS)
        .single();
      error = result.error;
      savedTodo = result.data as Todo | null;
    }

    setLoading(false);

    if (error) {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      return;
    }

    toast.success(isEdit ? "Đã cập nhật công việc." : "Đã thêm công việc.");
    if (savedTodo) {
      onSaved?.(savedTodo);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa công việc" : "Thêm công việc"}
          </DialogTitle>
          <DialogDescription>Nhập thông tin công việc.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              placeholder="Tùy chọn"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Hạn chót</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Độ ưu tiên</Label>
            <Select
              value={priority}
              onValueChange={(v) =>
                setPriority((v as TodoPriority) ?? "medium")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TODO_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {TODO_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
