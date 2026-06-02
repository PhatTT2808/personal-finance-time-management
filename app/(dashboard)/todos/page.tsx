import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import type { Todo } from "@/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { TodoDialog } from "@/components/todos/todo-dialog";
import { TodoItem } from "@/components/todos/todo-item";

function Section({
  title,
  todos,
  overdue,
}: {
  title: string;
  todos: Todo[];
  overdue?: boolean;
}) {
  if (todos.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {title} ({todos.length})
      </h2>
      <div className="space-y-2">
        {todos.map((t) => (
          <TodoItem key={t.id} todo={t} overdue={overdue} />
        ))}
      </div>
    </div>
  );
}

export default async function TodosPage() {
  const today = todayISO();
  const supabase = await createClient();

  const { data } = await supabase
    .from("todos")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const todos = (data ?? []) as Todo[];

  const pending = todos.filter((t) => t.status === "pending");
  const done = todos.filter((t) => t.status === "done");

  const overdueTodos = pending.filter(
    (t) => t.due_date && t.due_date < today
  );
  const todayTodos = pending.filter((t) => t.due_date === today);
  const upcomingTodos = pending.filter(
    (t) => !t.due_date || t.due_date > today
  );

  const isEmpty = todos.length === 0;

  return (
    <div>
      <PageHeader
        title="Việc cần làm"
        description="Theo dõi và hoàn thành các công việc."
        action={
          <TodoDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm công việc
              </Button>
            }
          />
        }
      />

      {isEmpty ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Chưa có công việc nào. Hãy thêm công việc đầu tiên.
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Quá hạn" todos={overdueTodos} overdue />
          <Section title="Hôm nay" todos={todayTodos} />
          <Section title="Sắp tới" todos={upcomingTodos} />
          <Section title="Đã hoàn thành" todos={done} />
        </div>
      )}
    </div>
  );
}
