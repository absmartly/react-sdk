import React, { FC, ReactNode, useState, useMemo, useCallback, useRef } from "react";

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
      return typeof context.getSDK === "function"
        ? context.getSDK()
        : (context as any)["_sdk"];
    }
    return new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions });
  });

  const [providedContext, setProvidedContext] = useState(
    context ? context : sdk.createContext(contextOptions),
  );

  const [contextError, setContextError] = useState<Error | null>(null);

  const contextRef = useRef(providedContext);
  contextRef.current = providedContext;

  const resetContext = useCallback(
    async (
      params: ContextRequestType,
      contextOptions?: ContextOptionsType,
    ) => {
      try {
        const ctx = contextRef.current;
        await ctx.ready();

        const contextData = ctx.data();
        const oldContextOptions = typeof ctx.getOptions === "function"
          ? ctx.getOptions()
          : (ctx as any)._opts;

        const combinedContextOptions = {
          ...oldContextOptions,
          ...contextOptions,
        };

        await ctx.finalize();

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
    [sdk]
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
