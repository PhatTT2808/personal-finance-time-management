import type {
  TimeBlockType,
  TodoPriority,
  TodoStatus,
  TransactionType,
} from "@/types/database";

// Default categories (Vietnamese labels, used as the stored category value).
export const EXPENSE_CATEGORIES = [
  "Ăn uống",
  "Tiền trọ",
  "Đi lại",
  "Học tập",
  "Gym",
  "Mua sắm",
  "Giải trí",
  "Khác",
] as const;

export const INCOME_CATEGORIES = [
  "Làm thêm",
  "Gia đình",
  "Freelance",
  "Học bổng",
  "Khác",
] as const;

export function getCategories(type: TransactionType): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// Vietnamese labels for transaction type.
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Thu nhập",
  expense: "Chi tiêu",
};

// Vietnamese labels for time block type.
export const TIME_BLOCK_TYPE_LABELS: Record<TimeBlockType, string> = {
  study: "Học",
  work: "Làm việc",
  gym: "Gym",
  school: "Trường",
  rest: "Nghỉ ngơi",
  other: "Khác",
};

export const TIME_BLOCK_TYPES = Object.keys(
  TIME_BLOCK_TYPE_LABELS
) as TimeBlockType[];

// Vietnamese labels for todo priority.
export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

export const TODO_PRIORITIES = Object.keys(
  TODO_PRIORITY_LABELS
) as TodoPriority[];

// Vietnamese labels for todo status.
export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  pending: "Chưa xong",
  done: "Hoàn thành",
};
