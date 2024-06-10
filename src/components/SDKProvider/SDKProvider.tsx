import { useState, type FC, type ReactNode } from "react";

import absmartly, { Context, SDK } from "@absmartly/javascript-sdk";

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

type SDKProviderNullContext = {
  context: null;
  children?: ReactNode;
  sdkOptions: SDKOptionsType;
  contextOptions?: never;
};

type SDKProviderProps =
  | SDKProviderNoContext
  | SDKProviderWithContext
  | SDKProviderNullContext;

export const SDKProvider: FC<SDKProviderProps> = ({
  sdkOptions,
  contextOptions,
  context,
  children,
}) => {
  const sdk: SDK =
    context == null
      ? new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions })
      : context["_sdk"];

  const [providedContext, setProvidedContext] = useState<Context | null>(
    context === null
      ? null
      : context === undefined
        ? sdk.createContext(contextOptions)
        : context,
  );

  const resetContext = async (
    params: ContextRequestType,
    contextOptions?: ContextOptionsType,
  ) => {
    try {
      if (providedContext == null) {
        setProvidedContext(sdk.createContext(params, contextOptions));
        return;
      }

      await providedContext.ready();

      const contextData = providedContext.data();
      const oldContextOptions = providedContext["_opts"];

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
