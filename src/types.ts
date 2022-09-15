export type ProdOrDevType = "production" | "development";

export type SDKOptionsType = {
  endpoint: string;
  apiKey: string;
  environment: string;
  application: string;
  retries?: number;
  timeout?: number;
};
