"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Todo } from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TodoDialog } from "@/components/todos/todo-dialog";
import { TodoItem } from "@/components/todos/todo-item";

type Props = {
  initialTodos: Todo[];
  today: string;
};

function sortTodos(rows: Todo[]) {
  return [...rows].sort((a, b) => {
    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

function Section({
  title,
  todos,
  overdue,
  onSaved,
  onDeleted,
  onStatusChanged,
}: {
  title: string;
  todos: Todo[];
  overdue?: boolean;
  onSaved: (todo: Todo) => void;
  onDeleted: (id: string) => void;
  onStatusChanged: (todo: Todo) => void;
}) {
  if (todos.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
        {title} ({todos.length})
      </h2>
      <div className="space-y-2">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            overdue={overdue}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onStatusChanged={onStatusChanged}
          />
        ))}
      </div>
    </div>
  );
}

export function TodosClient({ initialTodos, today }: Props) {
  const [todos, setTodos] = useState(initialTodos);

  function upsertTodo(todo: Todo) {
    setTodos((current) => sortTodos([
      ...current.filter((item) => item.id !== todo.id),
      todo,
    ]));
  }

  function deleteTodo(id: string) {
    setTodos((current) => current.filter((item) => item.id !== id));
  }

  const pending = todos.filter((todo) => todo.status === "pending");
  const done = todos.filter((todo) => todo.status === "done");
  const overdueTodos = pending.filter(
    (todo) => todo.due_date && todo.due_date < today
  );
  const todayTodos = pending.filter((todo) => todo.due_date === today);
  const upcomingTodos = pending.filter(
    (todo) => !todo.due_date || todo.due_date > today
  );

  return (
    <div>
      <PageHeader
        title="Việc cần làm"
        description="Theo dõi và hoàn thành các công việc."
        action={
          <TodoDialog
            onSaved={upsertTodo}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm công việc
              </Button>
            }
          />
        }
      />

      {todos.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-8 text-center text-sm text-slate-400 shadow-2xl shadow-black/20">
          Chưa có công việc nào. Hãy thêm công việc đầu tiên.
        </div>
      ) : (
        <div className="space-y-6">
          <Section
            title="Quá hạn"
            todos={overdueTodos}
            overdue
            onSaved={upsertTodo}
            onDeleted={deleteTodo}
            onStatusChanged={upsertTodo}
          />
          <Section
            title="Hôm nay"
            todos={todayTodos}
            onSaved={upsertTodo}
            onDeleted={deleteTodo}
            onStatusChanged={upsertTodo}
          />
          <Section
            title="Sắp tới"
            todos={upcomingTodos}
            onSaved={upsertTodo}
            onDeleted={deleteTodo}
            onStatusChanged={upsertTodo}
          />
          <Section
            title="Đã hoàn thành"
            todos={done}
            onSaved={upsertTodo}
            onDeleted={deleteTodo}
            onStatusChanged={upsertTodo}
          />
        </div>
      )}
    </div>
  );
}