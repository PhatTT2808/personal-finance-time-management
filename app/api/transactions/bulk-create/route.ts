import { NextResponse } from "next/server";
import { todayISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/lib/ai/types";
import type { Transaction } from "@/types/database";

const MAX_TRANSACTIONS = 20;
const TRANSACTION_COLUMNS =
  "id, user_id, type, amount, category, note, transaction_date, created_at, updated_at";
type InvalidTransactionDetail = { index: number; fields: string[] };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { transactions?: unknown };
  if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Danh sách giao dịch không hợp lệ." },
      { status: 400 }
    );
  }

  if (body.transactions.length > MAX_TRANSACTIONS) {
    return NextResponse.json(
      { ok: false, error: "Chỉ có thể lưu tối đa 20 giao dịch mỗi lần." },
      { status: 400 }
    );
  }

  const invalidRows: InvalidTransactionDetail[] = [];
  const transactions = body.transactions.map((transaction, index) =>
    validateTransaction(transaction, index, invalidRows)
  );
  if (invalidRows.length > 0) {
    debugInvalidRows(invalidRows);
    return NextResponse.json(
      {
        ok: false,
        error: "Một hoặc nhiều giao dịch không hợp lệ.",
        ...(process.env.NODE_ENV === "production" ? {} : { details: invalidRows }),
      },
      { status: 400 }
    );
  }

  const rows = (transactions as ParsedTransaction[]).map((transaction) => ({
    ...transaction,
    user_id: user.id,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .insert(rows)
    .select(TRANSACTION_COLUMNS);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Không thể lưu giao dịch. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, transactions: (data ?? []) as Transaction[] });
}

function validateTransaction(
  value: unknown,
  index: number,
  invalidRows: InvalidTransactionDetail[]
): ParsedTransaction | null {
  if (!isRecord(value)) {
    invalidRows.push({ index, fields: ["transaction"] });
    return null;
  }

  const type = value.type;
  const amount = Math.abs(Number(value.amount));
  const category = typeof value.category === "string" ? value.category.trim() : "";
  const note = typeof value.note === "string" && value.note.trim() ? value.note.trim().slice(0, 300) : null;
  const rawTransactionDate = value.transaction_date;
  const transactionDate = typeof rawTransactionDate === "string" && rawTransactionDate.trim()
    ? rawTransactionDate.trim()
    : todayISO();
  const invalidFields: string[] = [];

  debugReceivedRow(index, rawTransactionDate, transactionDate);

  if (type !== "income" && type !== "expense") invalidFields.push("type");
  if (!Number.isInteger(amount) || amount <= 0) invalidFields.push("amount");
  if (!category) invalidFields.push("category");
  if (!isValidISODate(transactionDate)) invalidFields.push(formatDateError(rawTransactionDate));

  if (invalidFields.length > 0) {
    invalidRows.push({ index, fields: invalidFields });
    return null;
  }

  return { type, amount, category, note, transaction_date: transactionDate } as ParsedTransaction;
}

function debugInvalidRows(invalidRows: InvalidTransactionDetail[]) {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[transactions/bulk-create] invalid_rows:", invalidRows);
}

function debugReceivedRow(index: number, rawTransactionDate: unknown, sanitizedTransactionDate: string) {
  if (process.env.NODE_ENV === "production") return;
  console.debug("[transactions/bulk-create] received_row:", {
    index,
    has_transaction_date: rawTransactionDate !== undefined && rawTransactionDate !== null,
    transaction_date_type: typeof rawTransactionDate,
    sanitized_transaction_date: sanitizedTransactionDate,
  });
}

function formatDateError(rawTransactionDate: unknown) {
  if (process.env.NODE_ENV === "production") return "transaction_date";
  return `transaction_date invalid: ${String(rawTransactionDate)}`;
}

function isValidISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
