import "dotenv/config";
import cron from "node-cron";
import { loadConfig } from "./config";
import { PiggiClient } from "./piggi";
import { scrapeAndSend } from "./scraper";

async function runAllBanks(): Promise<void> {
  const config = loadConfig();
  const piggi = new PiggiClient(config.piggi);

  const enabledBanks = config.banks.filter((b) => b.enabled);

  if (enabledBanks.length === 0) {
    console.log("No banks enabled in config");
    return;
  }

  console.log(
    `\n=== piggi open banking — ${new Date().toLocaleString("es-CL")} ===`
  );
  console.log(`Banks: ${enabledBanks.map((b) => b.id).join(", ")}`);
  console.log(`API: ${config.piggi.apiUrl}\n`);

  for (const bank of enabledBanks) {
    if (!bank.credentials.rut || !bank.credentials.password) {
      console.warn(`[${bank.id}] Skipped — missing credentials`);
      continue;
    }

    await scrapeAndSend(bank, piggi);
    console.log("");
  }

  console.log("=== Done ===\n");
}

async function main(): Promise<void> {
  const config = loadConfig();

  // Run immediately
  await runAllBanks();

  // Schedule if enabled
  if (config.schedule.enabled) {
    if (!cron.validate(config.schedule.cron)) {
      console.error(`Invalid cron expression: ${config.schedule.cron}`);
      process.exit(1);
    }

    console.log(`Scheduler active: "${config.schedule.cron}"`);
    console.log("Press Ctrl+C to stop\n");

    cron.schedule(config.schedule.cron, () => {
      runAllBanks().catch(console.error);
    });
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
