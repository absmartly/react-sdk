import {
  ABSmartlyProvider,
  useABSmartly,
  withABSmartly,
} from "./components/ABSmartlyProvider";
import {
  Treatment,
  TreatmentFunction,
  TreatmentVariant,
} from "./components/Treatment";
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
};

export default ABSmartlyProvider;
