import fs from "fs";
import path from "path";
import type { AppConfig } from "./types";

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");
const LOCAL_CONFIG_PATH = path.resolve(process.cwd(), "config.local.json");

export function loadConfig(): AppConfig {
  // Prefer config.local.json over config.json
  const configFile = fs.existsSync(LOCAL_CONFIG_PATH)
    ? LOCAL_CONFIG_PATH
    : CONFIG_PATH;

  if (!fs.existsSync(configFile)) {
    throw new Error(`Config file not found: ${configFile}`);
  }

  const raw = fs.readFileSync(configFile, "utf-8");
  const config: AppConfig = JSON.parse(raw);

  // Override piggi config from env vars
  if (process.env.PIGGI_API_URL) {
    config.piggi.apiUrl = process.env.PIGGI_API_URL;
  }
  if (process.env.PIGGI_API_KEY) {
    config.piggi.apiKey = process.env.PIGGI_API_KEY;
  }

  // Override bank credentials from env vars
  // Format: BANCO_ESTADO_RUT, BANCO_ESTADO_PASS
  for (const bank of config.banks) {
    const envPrefix = bank.id.toUpperCase();
    const envRut = process.env[`${envPrefix}_RUT`];
    const envPass = process.env[`${envPrefix}_PASS`];

    if (envRut) bank.credentials.rut = envRut;
    if (envPass) bank.credentials.password = envPass;
  }

  // Validate
  if (!config.piggi.apiKey) {
    throw new Error(
      "API key required. Set PIGGI_API_KEY env var or piggi.apiKey in config.json"
    );
  }

  return config;
}
