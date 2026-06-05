import type { TimeBlockType, TodoPriority, TransactionType } from "@/types/database";

export type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  category: string;
  note: string | null;
  transaction_date: string;
};

export type TransactionParseResult = {
  ok: boolean;
  transactions: ParsedTransaction[];
  question: string | null;
};

export type TodoPlanningPreview = {
  kind: "todo";
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TodoPriority;
  status: "pending";
};

export type TimeBlockPlanningPreview = {
  kind: "time_block";
  title: string;
  type: TimeBlockType;
  custom_type: string | null;
  block_date: string;
  start_time: string;
  end_time: string;
  note: string | null;
};

export type PlanningPreviewItem = TodoPlanningPreview | TimeBlockPlanningPreview;

export type PlanningParseResult = {
  ok: boolean;
  items: PlanningPreviewItem[];
  question: string | null;
};
