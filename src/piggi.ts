import type {
  PiggiConfig,
  PiggiBatchRequest,
  PiggiBatchResponse
} from "./types";

export class PiggiClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(config: PiggiConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  async sendBatch(batch: PiggiBatchRequest): Promise<PiggiBatchResponse> {
    const url = `${this.apiUrl}/v1/transactions/batch`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey
      },
      body: JSON.stringify(batch)
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`piggi API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<PiggiBatchResponse>;
  }

  async listInstitutions(): Promise<Array<{ slug: string; name: string }>> {
    const url = `${this.apiUrl}/v1/financial-institutions`;

    const res = await fetch(url, {
      headers: { "X-API-Key": this.apiKey }
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`piggi API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<Array<{ slug: string; name: string }>>;
  }
}
