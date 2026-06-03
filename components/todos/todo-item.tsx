"use client";

import { useState } from "react";
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
  low: "border-slate-300/15 bg-slate-400/10 text-slate-300",
  medium: "border-amber-300/20 bg-amber-400/10 text-amber-300",
  high: "border-red-300/20 bg-red-400/10 text-red-300",
};

type Props = {
  todo: Todo;
  overdue?: boolean;
  onSaved?: (todo: Todo) => void;
  onDeleted?: (id: string) => void;
  onStatusChanged?: (todo: Todo) => void;
};

export function TodoItem({
  todo,
  overdue,
  onSaved,
  onDeleted,
  onStatusChanged,
}: Props) {
  const [loading, setLoading] = useState(false);
  const done = todo.status === "done";

  async function toggleStatus() {
    const nextTodo: Todo = {
      ...todo,
      status: done ? "pending" : "done",
    };

    onStatusChanged?.(nextTodo);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("todos")
      .update({ status: nextTodo.status })
      .eq("id", todo.id);
    setLoading(false);

    if (error) {
      onStatusChanged?.(todo);
      toast.error("Không thể cập nhật trạng thái.");
      return;
    }
  }

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 shadow-lg shadow-black/10 transition hover:border-sky-300/20 hover:bg-white/[0.055]", done && "opacity-75")}>
      <Button
        variant="ghost"
        size="icon"
        className={cn("mt-0.5 shrink-0 text-slate-400 hover:bg-white/10 hover:text-sky-200", done && "text-emerald-300 hover:text-emerald-200")}
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
            "font-semibold text-slate-100",
            done && "text-slate-500 line-through"
          )}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p className="truncate text-sm text-slate-500">
            {todo.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={cn("border", PRIORITY_STYLES[todo.priority])}>
            {TODO_PRIORITY_LABELS[todo.priority]}
          </Badge>
          {todo.due_date && (
            <span
              className={cn(
                "text-xs text-slate-400",
                overdue && !done && "font-semibold text-red-300"
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
          onSaved={onSaved}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Sửa" className="text-slate-400 hover:bg-white/10 hover:text-sky-200">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
        <ConfirmDelete
          table="todos"
          id={todo.id}
          onDeleted={() => onDeleted?.(todo.id)}
          description="Bạn có chắc chắn muốn xóa công việc này không?"
          trigger={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Xóa"
              className="text-red-300 hover:bg-red-400/10 hover:text-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
