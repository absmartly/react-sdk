import type { Context, SDK } from "@absmartly/javascript-sdk";

declare module "@absmartly/javascript-sdk" {
  interface Context {
    getSDK(): SDK;
    getOptions(): { publishDelay: number; refreshPeriod: number };
  }
}

export type SDKOptionsType = {
  endpoint: string;
  apiKey: string;
  environment: string;
  application: string;
  retries?: number;
  timeout?: number;
  eventLogger?: (context: Context, eventName: EventNameType, data: any) => void;
};

export type ABSmartlyContext = Context;

export type ABSmartlySDK = SDK;

export type ABSmartly = {
  sdk: ABSmartlySDK;
  context: ABSmartlyContext;
  resetContext: (
    contextRequest: ContextRequestType,
    contextOptions?: ContextOptionsType,
  ) => Promise<void>;
  contextError?: Error | null;
};

export type ContextRequestType = { units: Record<string, unknown> };

export type ContextOptionsType = {
  publishDelay?: number;
  refreshPeriod?: number;
};

export type EventNameType =
  | "error"
  | "ready"
  | "refresh"
  | "publish"
  | "exposure"
  | "goal"
  | "finalize";

export type TreatmentProps = {
  variant: number | undefined;
  variables: Record<string, any>;
};

export type Char = string;
