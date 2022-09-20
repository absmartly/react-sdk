import { SDKProvider, useABSmartly } from "./components/SDKProvider";
import { Treatment, TreatmentVariant } from "./components/Treatment";
import { mergeConfig } from "@absmartly/javascript-sdk";

export * from "@absmartly/javascript-sdk";

export { mergeConfig, Treatment, TreatmentVariant, useABSmartly };

export default SDKProvider;
