import type { PlanningPreviewItem } from "@/lib/ai/types";
import type { TimeBlockType, TodoPriority } from "@/types/database";

const TODO_PRIORITIES: TodoPriority[] = ["low", "medium", "high"];
const TIME_BLOCK_TYPES: TimeBlockType[] = ["study", "work", "gym", "school", "rest", "other"];

export function normalizePlanningItems(value: unknown, today: string, maxItems = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => normalizePlanningItem(item, today))
    .filter((item): item is PlanningPreviewItem => Boolean(item));
}

export function normalizePlanningItem(value: unknown, today: string): PlanningPreviewItem | null {
  if (!isRecord(value)) return null;

  if (value.kind === "todo") {
    const title = readTrimmedString(value.title);
    const dueDate = readNullableDate(value.due_date);
    const priority = TODO_PRIORITIES.includes(value.priority as TodoPriority)
      ? (value.priority as TodoPriority)
      : "medium";

    if (!title) return null;

    return {
      kind: "todo",
      title,
      description: readNullableText(value.description, 500),
      due_date: dueDate,
      priority,
      status: "pending",
    };
  }

  if (value.kind === "time_block") {
    const title = readTrimmedString(value.title);
    const blockDate = readDate(value.block_date) ?? today;
    const startTime = readTime(value.start_time);
    const type = TIME_BLOCK_TYPES.includes(value.type as TimeBlockType)
      ? (value.type as TimeBlockType)
      : "other";

    if (!title || !startTime) return null;

    const rawEndTime = readTime(value.end_time);
    const endTime = rawEndTime && isAfterTime(startTime, rawEndTime)
      ? rawEndTime
      : addOneHour(startTime);

    return {
      kind: "time_block",
      title,
      type,
      custom_type: type === "other" ? readNullableText(value.custom_type, 80) : null,
      block_date: blockDate,
      start_time: startTime,
      end_time: endTime,
      note: readNullableText(value.note, 500),
    };
  }

  return null;
}

export function isValidPlanningItem(item: PlanningPreviewItem) {
  if (item.kind === "todo") {
    return Boolean(
      item.title.trim() &&
        TODO_PRIORITIES.includes(item.priority) &&
        item.status === "pending" &&
        (item.due_date === null || isValidISODate(item.due_date))
    );
  }

  return Boolean(
    item.title.trim() &&
      isValidISODate(item.block_date) &&
      isValidTime(item.start_time) &&
      isValidTime(item.end_time) &&
      isAfterTime(item.start_time, item.end_time) &&
      TIME_BLOCK_TYPES.includes(item.type)
  );
}

function readTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 200) : "";
}

function readNullableText(value: unknown, maxLength: number) {
  const text = typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  return text || null;
}

function readNullableDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return readDate(value);
}

function readDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = value.trim();
  return isValidISODate(date) ? date : null;
}

function readTime(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/u);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isValidISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/u.test(value);
}

function isAfterTime(start: string, end: string) {
  return toMinutes(end) > toMinutes(start);
}

function addOneHour(time: string) {
  const minutes = Math.min(toMinutes(time) + 60, 23 * 60 + 59);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}