import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import type { Todo } from "@/types/database";
import { TodosClient } from "@/components/todos/todos-client";

export default async function TodosPage() {
  const today = todayISO();
  const supabase = await createClient();

  const { data } = await supabase
    .from("todos")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const todos = (data ?? []) as Todo[];

  return <TodosClient initialTodos={todos} today={today} />;
}
