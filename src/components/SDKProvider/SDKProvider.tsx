import { useState, type FC, type ReactNode } from "react";

import absmartly from "@absmartly/javascript-sdk";

import { _SdkContext } from "../../hooks/useABSmartly";
import type {
  ABSmartly,
  ABSmartlyContext,
  ContextOptionsType,
  ContextRequestType,
  SDKOptionsType,
} from "../../types";

type SDKProviderNoContext = {
  sdkOptions: SDKOptionsType;
  context?: never;
  contextOptions: { units: Record<string, any> };
  children?: ReactNode;
};

type SDKProviderWithContext = {
  context: ABSmartlyContext;
  children?: ReactNode;
  sdkOptions?: never;
  contextOptions?: never;
};

type SDKProviderProps = SDKProviderNoContext | SDKProviderWithContext;

export const SDKProvider: FC<SDKProviderProps> = ({
  sdkOptions,
  contextOptions,
  context,
  children,
}) => {
  const sdk = context
    ? context["_sdk"]
    : new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions });

  const [providedContext, setProvidedContext] = useState(
    context ? context : sdk.createContext(contextOptions),
  );

  const resetContext = async (
    params: ContextRequestType,
    contextOptions?: ContextOptionsType,
  ) => {
    try {
      await providedContext.ready();

      const contextData = providedContext.data();
      const oldContextOptions = providedContext._opts;

      const combinedContextOptions = {
        ...oldContextOptions,
        ...contextOptions,
      };

      await providedContext.finalize();

      setProvidedContext(
        sdk.createContextWith(params, contextData, combinedContextOptions),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const value: ABSmartly = {
    sdk,
    context: providedContext,
    resetContext,
  };

  return <_SdkContext.Provider value={value}>{children}</_SdkContext.Provider>;
};
