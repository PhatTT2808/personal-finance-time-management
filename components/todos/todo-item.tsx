"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { TODO_PRIORITY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Todo } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TodoDialog } from "@/components/todos/todo-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<Todo["priority"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

export function TodoItem({ todo, overdue }: { todo: Todo; overdue?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const done = todo.status === "done";

  async function toggleStatus() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("todos")
      .update({ status: done ? "pending" : "done" })
      .eq("id", todo.id);
    setLoading(false);

    if (error) {
      toast.error("Không thể cập nhật trạng thái.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <Button
        variant="ghost"
        size="icon"
        className={cn("mt-0.5 shrink-0", done && "text-emerald-600")}
        onClick={toggleStatus}
        disabled={loading}
        aria-label={done ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
      >
        {done ? (
          <Check className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </Button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium",
            done && "text-muted-foreground line-through"
          )}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p className="truncate text-sm text-muted-foreground">
            {todo.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={PRIORITY_STYLES[todo.priority]}>
            {TODO_PRIORITY_LABELS[todo.priority]}
          </Badge>
          {todo.due_date && (
            <span
              className={cn(
                "text-xs text-muted-foreground",
                overdue && !done && "font-medium text-rose-600"
              )}
            >
              Hạn: {formatDate(todo.due_date)}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <TodoDialog
          todo={todo}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Sửa">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
        <ConfirmDelete
          table="todos"
          id={todo.id}
          description="Bạn có chắc chắn muốn xóa công việc này không?"
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
    </div>
  );
}
