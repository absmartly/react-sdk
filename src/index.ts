import { SDKProvider, useABSmartly } from "./components/SDKProvider";
import { Treatment, TreatmentVariant } from "./components/Treatment";
import { mergeConfig } from "@absmartly/javascript-sdk";
import { TreatmentProps } from "./types";

export * from "@absmartly/javascript-sdk";

export {
  TreatmentProps,
  mergeConfig,
  Treatment,
  TreatmentVariant,
  useABSmartly,
};

export default SDKProvider;
