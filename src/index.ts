import { SDKProvider } from "./components/SDKProvider";
import {
  Treatment,
  TreatmentFunction,
  TreatmentVariant,
} from "./components/Treatment";
import { useTreatment } from "./hooks/useTreatment";

import { withABSmartly } from "./hooks/HOCs/withABSmartly";
import { useABSmartly } from "./hooks/useABSmartly";

import { mergeConfig } from "@absmartly/javascript-sdk";
import {
  ABSmartly,
  ABSmartlyContext,
  ABSmartlySDK,
  TreatmentProps,
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
