import { SDKProvider } from "./components/SDKProvider";
import {
  Treatment,
  TreatmentFunction,
  TreatmentVariant,
} from "./components/Treatment";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTreatment } from "./hooks/useTreatment";
import { useContextReady } from "./hooks/useContextReady";

import { withABSmartly } from "./hooks/HOCs/withABSmartly";
import { useABSmartly, useOptionalABSmartly } from "./hooks/useABSmartly";

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
  ErrorBoundary,
  useABSmartly,
  useOptionalABSmartly,
  useContextReady,
  withABSmartly,
  useTreatment,
};

export default SDKProvider;
