// Formatting helpers shared across the app.

// Format a number as Vietnamese Dong, e.g. 1500000 -> "1.500.000 ₫".
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format an ISO date string (YYYY-MM-DD) as "dd/MM/yyyy".
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

// Trim "HH:mm:ss" coming from Postgres `time` to "HH:mm".
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

// Today's date as "YYYY-MM-DD" (local time).
export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

// First and last day of a given month as "YYYY-MM-DD".
// month is 1-12.
export function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;
  return { start, end };
}

// Number of hours between two "HH:mm" times (handles same-day blocks).
export function hoursBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
}

// Round hours to at most 1 decimal place for display.
export function formatHours(hours: number): string {
  return (Math.round(hours * 10) / 10).toString();
}

// ISO dates (YYYY-MM-DD) for the current week, Monday..Sunday.
export function weekRange(reference: string): { start: string; end: string } {
  const ref = new Date(`${reference}T00:00:00`);
  const day = ref.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISO(monday), end: toISO(sunday) };
}

function toISO(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
