// Shared application types and DB row shapes.
// Column names are English; UI labels (Vietnamese) live in the components.

export type TransactionType = "income" | "expense";

export type TimeBlockType =
  | "study"
  | "work"
  | "gym"
  | "school"
  | "rest"
  | "other";

export type TodoStatus = "pending" | "done";
export type TodoPriority = "low" | "medium" | "high";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string | null;
  transaction_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: string;
  user_id: string;
  title: string;
  type: TimeBlockType;
  custom_type?: string | null;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  block_date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  due_date: string | null; // YYYY-MM-DD
  priority: TodoPriority;
  created_at: string;
  updated_at: string;
}
