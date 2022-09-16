import { SDKProvider, useABSmartly } from "./components/SDKProvider";
import { Treatment } from "./components/Treatment";
import { mergeConfig } from "@absmartly/javascript-sdk";

export * from "@absmartly/javascript-sdk";

export { mergeConfig, Treatment, useABSmartly };

export default SDKProvider;
