import { NextResponse } from "next/server";
import { todayISO } from "@/lib/format";
import { isTransactionScopedMessage } from "@/lib/ai/guards/transaction-scope-guard";
import { createKimiJsonCompletion } from "@/lib/ai/model/kimi-client";
import { buildTransactionParserPrompt } from "@/lib/ai/prompts/transaction-parser";
import type { ParsedTransaction, TransactionParseResult } from "@/lib/ai/types";

const MAX_MESSAGE_LENGTH = 1500;
const MAX_TRANSACTIONS = 20;
const MONEY_PATTERN = /([+-]?\s*\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu)(?=\s|$|[,;])/giu;
const INCOME_WORDS = ["thu", "nhận", "lương", "shipper", "freelance", "học bổng", "phụ cấp", "cho", "tặng", "làm thêm"];
const FALLBACK_UNSURE_QUESTION = "Mình chưa chắc cách ghi giao dịch này. Bạn có thể nói rõ hơn không?";
const AI_TIMEOUT_QUESTION = "AI phản hồi quá lâu, bạn thử lại hoặc nhập ngắn hơn nhé.";
const BLOCKED_RESPONSE: TransactionParseResult = {
  ok: false,
  transactions: [],
  question: "Mình chỉ hỗ trợ ghi nhận thu nhập và chi tiêu.",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { ok: false, transactions: [], question: "Vui lòng nhập nội dung giao dịch." },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { ok: false, transactions: [], question: "Nội dung quá dài. Vui lòng nhập ngắn gọn hơn." },
        { status: 400 }
      );
    }

    if (!isTransactionScopedMessage(message)) {
      return NextResponse.json(BLOCKED_RESPONSE);
    }

    debugParse("original_message", message);

    const kimiResult = await parseTransactionsWithKimi(message);
    if (kimiResult.ok && kimiResult.transactions.length > 0) {
      return NextResponse.json(kimiResult);
    }

    debugParse("kimi_fallback_reason", kimiResult.question);
    const result = parseTransactionsByRule(message);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI transaction parse failed", error);
    return NextResponse.json(
      {
        ok: false,
        transactions: [],
        question: "Mình chưa phân tích được nội dung này. Bạn có thể nhập rõ hơn không?",
      },
      { status: 200 }
    );
  }
}

async function parseTransactionsWithKimi(message: string): Promise<TransactionParseResult> {
  try {
    const today = todayISO();
    const content = await createKimiJsonCompletion([
      { role: "system", content: buildTransactionParserPrompt(today) },
      { role: "user", content: message },
    ]);
    const parsed = JSON.parse(content) as unknown;
    return normalizeParseResult(parsed, "kimi", today);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      debugParse("kimi_timeout", "25s");
      return { ok: false, transactions: [], question: AI_TIMEOUT_QUESTION };
    }
    debugParse("kimi_error", error instanceof Error ? error.message : String(error));
    return invalidResult();
  }
}

function parseTransactionsByRule(message: string): TransactionParseResult {
  debugParse("parser_selected", "rule_based_fallback");
  if (!isSimpleRuleFallbackInput(message)) {
    debugParse("validation_errors", ["Fallback skipped because input is not simple enough"]);
    return invalidResult();
  }

  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];
  const items = splitTransactionItems(message).slice(0, MAX_TRANSACTIONS);

  for (const item of items) {
    MONEY_PATTERN.lastIndex = 0;
    const matches = [...item.matchAll(MONEY_PATTERN)];
    if (matches.length === 0) {
      errors.push(`No amount found in item: ${item}`);
      continue;
    }

    if (matches.length !== 1) {
      errors.push(`Fallback item does not have exactly one amount: ${item}`);
      continue;
    }

    const match = matches[0];
    const amount = parseMoneyMatch(match);
    const note = cleanNote(item.replace(match[0], ""));
    const type = inferTransactionType(item, match[1] ?? "");
    const category = inferCategory(type, note || item);

    if (!amount) {
      errors.push(`Invalid amount in item: ${item}`);
      continue;
    }

    if (!note) {
      errors.push(`Missing note after amount cleanup in item: ${item}`);
      continue;
    }

    transactions.push({ type, amount, category, note, transaction_date: todayISO() });
  }

  debugParse("parsed_transactions", transactions.length);
  if (errors.length > 0) debugParse("validation_errors", errors);

  if (transactions.length === 0 || errors.length > 0) {
    return invalidResult();
  }

  return { ok: true, transactions, question: null };
}

function isSimpleRuleFallbackInput(message: string) {
  MONEY_PATTERN.lastIndex = 0;
  const matches = [...message.matchAll(MONEY_PATTERN)];
  if (matches.length === 1) return true;

  const items = splitTransactionItems(message);
  if (items.length < 2 || items.length !== matches.length) return false;

  return items.every((item) => {
    MONEY_PATTERN.lastIndex = 0;
    return [...item.matchAll(MONEY_PATTERN)].length === 1 && cleanNote(item.replace(MONEY_PATTERN, ""));
  });
}

function splitTransactionItems(message: string) {
  return message
    .split(/[,;\n]+/u)
    .flatMap((part) => splitByAndWhenBothSidesHaveMoney(part))
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitByAndWhenBothSidesHaveMoney(text: string): string[] {
  const parts = text.split(/\s+và\s+/iu).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return [text];
  return parts.every((part) => hasMoney(part)) ? parts : [text];
}

function hasMoney(text: string) {
  MONEY_PATTERN.lastIndex = 0;
  return MONEY_PATTERN.test(text);
}

function parseMoneyMatch(match: RegExpMatchArray) {
  const rawNumber = (match[1] ?? "").replace(/\s+/gu, "").replace(",", ".");
  const unit = (match[2] ?? "").toLowerCase();
  const value = Number.parseFloat(rawNumber.replace(/^[+-]/u, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const multiplier = unit === "k" || unit === "nghìn" || unit === "ngàn" ? 1000 : 1000000;
  return Math.round(value * multiplier);
}

function inferTransactionType(text: string, signedAmount: string): "income" | "expense" {
  const normalized = normalizeVietnamese(text);
  if (signedAmount.trim().startsWith("+")) return "income";
  if (signedAmount.trim().startsWith("-")) return "expense";
  if (INCOME_WORDS.some((word) => normalized.includes(normalizeVietnamese(word)))) return "income";
  return "expense";
}

function inferCategory(type: "income" | "expense", text: string) {
  const normalized = normalizeVietnamese(text);
  if (type === "income") {
    if (/shipper|part-time|lam them/u.test(normalized)) return "Làm thêm";
    if (/me|ba|bo|cha|gia dinh/u.test(normalized)) return "Gia đình";
    if (/freelance/u.test(normalized)) return "Freelance";
    if (/hoc bong/u.test(normalized)) return "Học bổng";
    return "Khác";
  }

  if (/an|uong|ca phe|com|hu tieu|nuoc mia/u.test(normalized)) return "Ăn uống";
  if (/tro|phong/u.test(normalized)) return "Tiền trọ";
  if (/xe|xang|grab|bus|gui xe/u.test(normalized)) return "Đi lại";
  if (/hoc|sach|khoa/u.test(normalized)) return "Học tập";
  if (/gym/u.test(normalized)) return "Gym";
  if (/mua|shopping/u.test(normalized)) return "Mua sắm";
  if (/giai tri|phim|game/u.test(normalized)) return "Giải trí";
  return "Khác";
}

function cleanNote(text: string) {
  MONEY_PATTERN.lastIndex = 0;
  return text
    .replace(MONEY_PATTERN, " ")
    .replace(/^\s*(?:(hôm nay|hom nay|chi|tiêu|tieu|mua|thu|nhận|nhan|từ|tu)\b\s*)+/iu, "")
    .replace(/\s+/gu, " ")
    .trim() || null;
}

function normalizeParseResult(value: unknown, parser: "kimi" | "rule_based", today: string): TransactionParseResult {
  debugParse("parser_selected", parser);
  if (!isRecord(value)) {
    debugParse("validation_errors", ["Response is not an object"]);
    return invalidResult();
  }

  if (value.ok === false) {
    return {
      ok: false,
      transactions: [],
      question: typeof value.question === "string" && value.question.trim()
        ? value.question.trim()
        : "Bạn có thể nói rõ hơn khoản thu/chi này không?",
    };
  }

  if (!Array.isArray(value.transactions)) {
    debugParse("validation_errors", ["transactions is not an array"]);
    return invalidResult();
  }

  const validationErrors: string[] = [];
  const rawTransactionCount = value.transactions.length;
  const limitedTransactions = value.transactions.slice(0, MAX_TRANSACTIONS);
  const transactions = limitedTransactions
    .map((transaction) => normalizeTransaction(transaction, validationErrors, today))
    .filter((transaction): transaction is ParsedTransaction => Boolean(transaction));
  const invalidTransactionCount = limitedTransactions.length - transactions.length;

  debugParse("raw_kimi_transaction_count", parser === "kimi" ? rawTransactionCount : undefined);
  debugParse("valid_transaction_count", transactions.length);
  debugParse("invalid_transaction_count", invalidTransactionCount);
  debugParse("validation_errors", validationErrors);

  if (transactions.length === 0) {
    return invalidResult();
  }

  return { ok: true, transactions, question: null };
}

function normalizeTransaction(value: unknown, errors: string[], today: string): ParsedTransaction | null {
  if (!isRecord(value)) {
    errors.push("Transaction is not an object");
    return null;
  }
  const type = value.type;
  const amount = Math.round(Math.abs(Number(value.amount)));
  const category = typeof value.category === "string" ? value.category.trim() : "";
  const note = typeof value.note === "string" && value.note.trim() ? value.note.trim() : null;
  const rawTransactionDate = typeof value.transaction_date === "string" ? value.transaction_date.trim() : "";
  const transactionDate = rawTransactionDate.toUpperCase() === "TODAY" || !rawTransactionDate ? today : rawTransactionDate;

  if (type !== "income" && type !== "expense") {
    errors.push(`Invalid type: ${String(type)}`);
    return null;
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    errors.push(`Invalid amount: ${String(value.amount)}`);
    return null;
  }
  if (!category) {
    errors.push("Missing category");
    return null;
  }
  if (!isValidISODate(transactionDate)) {
    errors.push(`Invalid transaction_date: ${transactionDate}`);
    return null;
  }

  return { type, amount, category, note, transaction_date: transactionDate };
}

function invalidResult(): TransactionParseResult {
  return {
    ok: false,
    transactions: [],
    question: FALLBACK_UNSURE_QUESTION,
  };
}

function isValidISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeVietnamese(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d");
}

function debugParse(label: string, value: unknown) {
  if (process.env.NODE_ENV === "production") return;
  console.debug(`[ai-transaction-parser] ${label}:`, value);
}
