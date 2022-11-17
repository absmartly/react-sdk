import {
  SDKProvider,
  useABSmartly,
  withABSmartly,
} from "./components/SDKProvider";
import { Treatment, TreatmentVariant } from "./components/Treatment";
import { mergeConfig } from "@absmartly/javascript-sdk";
import { TreatmentProps, ABSmartlySDK, ABSmartlyContext } from "./types";

export * from "@absmartly/javascript-sdk";

export type { TreatmentProps, ABSmartlySDK, ABSmartlyContext };

export {
  mergeConfig,
  Treatment,
  TreatmentVariant,
  useABSmartly,
  withABSmartly,
};

export default SDKProvider;
