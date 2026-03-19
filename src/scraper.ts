import { getBank } from "open-banking-chile";
import type { BankMovement } from "open-banking-chile";
import { generateExternalId } from "./hash";
import { PiggiClient } from "./piggi";
import type { BankConfig, PiggiBatchTransaction } from "./types";

// Map open-banking-chile bank IDs to piggi financial_entity_slug
const BANK_SLUG_MAP: Record<string, string> = {
  bchile: "banco_de_chile",
  bci: "banco_bci",
  estado: "banco_estado",
  bice: "banco_bice",
  falabella: "banco_falabella",
  itau: "banco_itau",
  santander: "banco_santander",
  scotiabank: "scotiabank",
  edwards: "banco_de_chile"
};

// Map movement source to a human-readable product name
const SOURCE_PRODUCT_MAP: Record<string, string> = {
  account: "Cuenta Corriente",
  credit_card_unbilled: "Tarjeta de Credito",
  credit_card_billed: "Tarjeta de Credito"
};

function convertDate(dateStr: string): string {
  // open-banking-chile returns dd-mm-yyyy, piggi expects yyyy-mm-dd
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 2) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

function movementToTransaction(
  movement: BankMovement,
  bankId: string,
  source: string
): PiggiBatchTransaction {
  const date = convertDate(movement.date);
  const type = movement.amount < 0 ? "EXPENSE" : "INCOME";
  // Use bankId + source as account identifier for hash uniqueness
  const accountId = `${bankId}:${source}`;

  return {
    external_id: generateExternalId(
      accountId,
      date,
      movement.description,
      movement.amount,
      type
    ),
    amount: movement.amount,
    description: movement.description,
    date
  };
}

function groupBySource(
  movements: BankMovement[]
): Record<string, BankMovement[]> {
  const groups: Record<string, BankMovement[]> = {};
  for (const m of movements) {
    const source = m.source || "account";
    if (!groups[source]) groups[source] = [];
    groups[source].push(m);
  }
  return groups;
}

async function sendChunked(
  transactions: PiggiBatchTransaction[],
  piggiSlug: string,
  productName: string,
  currency: string,
  bankId: string,
  piggiClient: PiggiClient
): Promise<void> {
  // Split into chunks of 250 (piggi max per batch)
  const chunks = [];
  for (let i = 0; i < transactions.length; i += 250) {
    chunks.push(transactions.slice(i, i + 250));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(
      `[${bankId}] ${productName} — batch ${i + 1}/${chunks.length} (${chunk.length} txs)...`
    );

    try {
      const response = await piggiClient.sendBatch({
        financial_entity_slug: piggiSlug,
        product_name: productName,
        currency,
        account_number: `${bankId}-auto`,
        transactions: chunk
      });

      console.log(
        `[${bankId}] ${productName} — ${response.processedCount} processed, ${response.duplicateCount} duplicates, ${response.errorCount} errors — ${response.status}`
      );

      if (response.failedExternalIds && response.failedExternalIds.length > 0) {
        console.warn(`[${bankId}] Failed IDs:`, response.failedExternalIds);
      }
    } catch (err) {
      console.error(`[${bankId}] Failed to send batch:`, err);
    }
  }
}

export async function scrapeAndSend(
  bankConfig: BankConfig,
  piggiClient: PiggiClient
): Promise<void> {
  const bank = getBank(bankConfig.id);
  if (!bank) {
    console.error(`[${bankConfig.id}] Bank not found in open-banking-chile`);
    return;
  }

  const piggiSlug = BANK_SLUG_MAP[bankConfig.id];
  if (!piggiSlug) {
    console.error(`[${bankConfig.id}] No piggi slug mapping found`);
    return;
  }

  const currency = bankConfig.currency || "CLP";

  console.log(`[${bankConfig.id}] Starting scrape...`);

  let result;
  try {
    result = await bank.scrape({
      rut: bankConfig.credentials.rut,
      password: bankConfig.credentials.password,
      headful: bankConfig.options?.headful,
      saveScreenshots: bankConfig.options?.saveScreenshots,
      chromePath: bankConfig.options?.chromePath,
      onProgress: (step: string) =>
        console.log(`  [${bankConfig.id}] ${step}`)
    });
  } catch (err) {
    console.error(`[${bankConfig.id}] Scrape failed:`, err);
    return;
  }

  if (!result.success) {
    console.error(`[${bankConfig.id}] Scrape unsuccessful: ${result.error}`);
    return;
  }

  if (result.movements.length === 0) {
    console.log(`[${bankConfig.id}] No movements found`);
    return;
  }

  console.log(
    `[${bankConfig.id}] Found ${result.movements.length} movements`
  );

  // Group movements by source and send one batch per product type
  const grouped = groupBySource(result.movements);

  for (const [source, movements] of Object.entries(grouped)) {
    const productName = SOURCE_PRODUCT_MAP[source] || source;

    console.log(
      `[${bankConfig.id}] ${productName} (${source}): ${movements.length} transactions`
    );

    const transactions = movements.map((m) =>
      movementToTransaction(m, bankConfig.id, source)
    );

    await sendChunked(
      transactions,
      piggiSlug,
      productName,
      currency,
      bankConfig.id,
      piggiClient
    );
  }
}
