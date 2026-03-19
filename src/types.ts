export interface BankConfig {
  id: string;
  enabled: boolean;
  credentials: {
    rut: string;
    password: string;
  };
  currency?: string;
  options?: {
    headful?: boolean;
    saveScreenshots?: boolean;
    chromePath?: string;
  };
}

export interface PiggiConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  cron: string;
}

export interface AppConfig {
  piggi: PiggiConfig;
  schedule: ScheduleConfig;
  banks: BankConfig[];
}

export interface PiggiBatchTransaction {
  external_id: string;
  amount: number;
  description: string;
  date: string;
}

export interface PiggiBatchRequest {
  financial_entity_slug: string;
  product_name: string;
  currency: string;
  account_number: string;
  transactions: PiggiBatchTransaction[];
}

export interface PiggiBatchResponse {
  batchId: string;
  txCount: number;
  processedCount: number;
  duplicateCount: number;
  errorCount: number;
  failedExternalIds?: string[];
  status: "COMPLETED" | "PARTIAL";
}
