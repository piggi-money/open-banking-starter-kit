import crypto from "crypto";

/**
 * Generates a deterministic external_id for a transaction.
 * Same inputs always produce the same ID — safe for deduplication.
 *
 * See: https://developers.piggi.cc/api/transactions#generar-external-id-determinista
 */
export function generateExternalId(
  accountNumber: string,
  date: string,
  description: string,
  amount: number,
  type: "EXPENSE" | "INCOME"
): string {
  const data = `${accountNumber}|${date}|${description}|${amount}|${type}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}
