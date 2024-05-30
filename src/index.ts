import {
  SDKProvider,
  useABSmartly,
  withABSmartly,
} from "./components/SDKProvider";
import {
  TreatmentFunction,
  Treatment,
  TreatmentVariant,
} from "./components/Treatment";
import { useTreatment } from "./hooks/useTreatment";
import { mergeConfig } from "@absmartly/javascript-sdk";
import {
  ABSmartly,
  TreatmentProps,
  ABSmartlySDK,
  ABSmartlyContext,
} from "./types";

export * from "@absmartly/javascript-sdk";

export type { ABSmartly, TreatmentProps, ABSmartlySDK, ABSmartlyContext };

export {
  mergeConfig,
  Treatment,
  TreatmentFunction,
  TreatmentVariant,
  useABSmartly,
  withABSmartly,
  useTreatment,
};

export default SDKProvider;
