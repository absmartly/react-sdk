import "./IntersectionObserver.js";

import {
  SDKProvider,
  useABSmartly,
  withABSmartly,
} from "./components/SDKProvider";
import { Treatment, TreatmentVariant } from "./components/Treatment";
import { mergeConfig } from "@absmartly/javascript-sdk";
import { TreatmentProps, ABSmartlySDK } from "./types";

export * from "@absmartly/javascript-sdk";

export type { TreatmentProps, ABSmartlySDK };

export {
  mergeConfig,
  Treatment,
  TreatmentVariant,
  useABSmartly,
  withABSmartly,
};

export default SDKProvider;
