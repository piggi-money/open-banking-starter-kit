import { getBank } from "open-banking-chile";
import type { BankMovement, ScrapeResult } from "open-banking-chile";
import { generateExternalId } from "./hash";
import { PiggiClient } from "./piggi";
import type { BankConfig, PiggiBatchTransaction, ProductConfig } from "./types";

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
  edwards: "banco_de_chile" // Edwards es parte de Banco de Chile
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
  product: ProductConfig
): PiggiBatchTransaction {
  const date = convertDate(movement.date);
  const type = movement.amount < 0 ? "EXPENSE" : "INCOME";

  return {
    external_id: generateExternalId(
      product.accountNumber,
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

  console.log(`[${bankConfig.id}] Starting scrape...`);

  let result: ScrapeResult;
  try {
    result = await bank.scrape({
      rut: bankConfig.credentials.rut,
      password: bankConfig.credentials.password,
      headful: bankConfig.options?.headful,
      saveScreenshots: bankConfig.options?.saveScreenshots,
      chromePath: bankConfig.options?.chromePath,
      onProgress: (step: string) => console.log(`  [${bankConfig.id}] ${step}`)
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

  // Send one batch per product
  for (const product of bankConfig.products) {
    const transactions = result.movements.map((m) =>
      movementToTransaction(m, product)
    );

    // Split into chunks of 250 (piggi max per batch)
    const chunks = [];
    for (let i = 0; i < transactions.length; i += 250) {
      chunks.push(transactions.slice(i, i + 250));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(
        `[${bankConfig.id}] Sending batch ${i + 1}/${chunks.length} (${chunk.length} txs)...`
      );

      try {
        const response = await piggiClient.sendBatch({
          financial_entity_slug: piggiSlug,
          product_name: product.name,
          currency: product.currency,
          account_number: product.accountNumber,
          transactions: chunk
        });

        console.log(
          `[${bankConfig.id}] Batch ${response.batchId}: ${response.processedCount} processed, ${response.duplicateCount} duplicates, ${response.errorCount} errors — ${response.status}`
        );

        if (
          response.failedExternalIds &&
          response.failedExternalIds.length > 0
        ) {
          console.warn(
            `[${bankConfig.id}] Failed IDs:`,
            response.failedExternalIds
          );
        }
      } catch (err) {
        console.error(`[${bankConfig.id}] Failed to send batch:`, err);
      }
    }
  }
}
