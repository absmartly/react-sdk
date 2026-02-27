import React, { FC, ReactNode, useState, useMemo, useCallback } from "react";

import absmartly from "@absmartly/javascript-sdk";

import { _SdkContext } from "../../hooks/useABSmartly";
import {
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
  const [sdk] = useState(() => {
    if (context) {
      return context.getSDK();
    }
    return new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions });
  });

  const [providedContext, setProvidedContext] = useState(
    context ? context : sdk.createContext(contextOptions),
  );

  const [contextError, setContextError] = useState<Error | null>(null);

  const resetContext = useCallback(
    async (
      params: ContextRequestType,
      contextOptions?: ContextOptionsType,
    ) => {
      try {
        await providedContext.ready();

        const contextData = providedContext.data();
        const oldContextOptions = providedContext.getOptions();

        const combinedContextOptions = {
          ...oldContextOptions,
          ...contextOptions,
        };

        await providedContext.finalize();

        const newContext = sdk.createContextWith(
          params,
          contextData,
          combinedContextOptions
        );

        setProvidedContext(newContext);
        setContextError(null);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setContextError(err);
        console.error("Failed to reset ABSmartly context:", err);
        throw err;
      }
    },
    [providedContext, sdk]
  );

  const value = useMemo<ABSmartly>(
    () => ({
      sdk,
      context: providedContext,
      resetContext,
      contextError,
    }),
    [sdk, providedContext, resetContext, contextError]
  );

  return <_SdkContext.Provider value={value}>{children}</_SdkContext.Provider>;
};
