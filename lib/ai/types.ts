import type { TransactionType } from "@/types/database";

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
